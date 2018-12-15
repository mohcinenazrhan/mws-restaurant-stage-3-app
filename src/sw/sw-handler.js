//! MNAZ-PWA Service Worker
//! version : 1.0.0
//! author  : MNAZ - Mohcine NAZRHAN
//! support : Cache/Background Sync/IndexedDB

import idb from 'idb';

var ignoreUrlParametersMatching = [/^utm_/];
let isVisible = false;

const TAG_TO_STORE = {
  'trigger-sync': {
    reqs: 'requests'
  },
  'reviews-sync': {
    reqs: 'post-requests',
    data: 'reviews'
  }
};

const navigateFallbackWhitelist = [/^\/restaurant/];
const navigateFallback = '/404.html'; // Just to test this feature

const BACKEND_API_ORIGIN = 'APIORIGIN';

const neverCacheUrls = [/mapbox/, /maps/];
// Check if current url is in the neverCacheUrls list
function checkNeverCacheList(url) {
  if (this.match(url)) {
    return false;
  }
  return true;
}

/**
 * get Parameter from Url
 * @param {String} search 
 * @param {String} sParam
 */
function getUrlParameter(search, sParam) {
  const sPageURL = search.substring(1),
    sURLVariables = sPageURL.split('&');
  let sParameterName, i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');

    if (sParameterName[0] === sParam) {
      return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
    }
  }
};

self.addEventListener('fetch', function (event) {
  let request = event.request,
      requestUrl = new URL(request.url);
  const urlParams = requestUrl.pathname.replace(/^\/+|\/+$/g, '').split('/')
  const store = urlParams[0];
  const methods = ['POST', 'PUT'];

  if (navigator.onLine === false && methods.includes(request.method)) {
    if (request.method === 'POST' && store === 'reviews') {
      return saveReqForBgSync({
        event,
        store,
        syncTagName: 'reviews-sync'
      });
    }

    if (request.method === 'PUT' && store === 'restaurants') {
      return saveReqForBgSync({
        event,
        store,
        id: parseInt(urlParams[1]),
        syncTagName: 'trigger-sync'
      });
    }
  }
  else if (request.method === 'PUT') {
    event.respondWith(fetch(request)
      .then((response) => response.json())
      .then((data) => {
        saveDataToIdb(data, store);
        return new Response(JSON.stringify(data))
      }))
  }
  else if(request.method === 'GET') {
    // Should we call event.respondWith() inside this fetch event handler?
    // This needs to be determined synchronously, which will give other fetch
    // handlers a chance to handle the request if need be.
    var shouldRespond;

    // First, remove all the ignored parameters and hash fragment, and see if we
    // have that URL in our cache. If so, great! shouldRespond will be true.
    var url = stripIgnoredUrlParameters(requestUrl, ignoreUrlParametersMatching);
    shouldRespond = urlsToCacheKeys.has(url);

    // If shouldRespond is false, check again, this time with 'index.html'
    // (or whatever the directoryIndex option is set to) at the end.
    var directoryIndex = 'index.html';
    if (!shouldRespond && directoryIndex) {
      url = addDirectoryIndex(url, directoryIndex);
      shouldRespond = urlsToCacheKeys.has(url);
    }

    // If shouldRespond is false, check again, this time with 'restaurant.html'.
    // whatever params request with the response should be the same.
    // cuz restaurant.html is a dynamic page.
    const customResponse = '/restaurant.html';
    const resId = getUrlParameter(requestUrl.search, 'id')
    if (!shouldRespond && customResponse) {
      if (requestUrl.pathname.startsWith(customResponse) &&
       resId !== '' && !isNaN(resId)) {
        // remove params from url
        url = requestUrl.href.replace(requestUrl.search, '');
        shouldRespond = urlsToCacheKeys.has(url);
      }
    }

    // If shouldRespond is still false, check to see if this is a navigation
    // request, and if so, whether the URL matches navigateFallbackWhitelist.    
    if (!shouldRespond &&
      navigateFallback &&
      (request.mode === 'navigate') &&
      isPathWhitelisted(navigateFallbackWhitelist, request.url)) {
      url = new URL(navigateFallback, self.location).toString();
      shouldRespond = urlsToCacheKeys.has(url);
    }

    // If shouldRespond was set to true at any point, then call
    // event.respondWith(), using the appropriate cache key.
    if (shouldRespond) {
      event.respondWith(
        caches.open(cacheName).then(function (cache) {
          return cache.match(urlsToCacheKeys.get(url)).then(function (response) {
            if (response) {
              return response;
            }
            throw Error('The cached response that was expected is missing.');
          });
        }).catch(function (e) {
          // Fall back to just fetch()ing the request if some unexpected error
          // prevented the cached response from being valid.
          console.warn('Couldn\'t serve response for "%s" from cache: %O', event.request.url, e);
          return fetch(event.request)
        })
      );
    } else {

      // Return if the current request url is in the never cache list
      if (!neverCacheUrls.every(checkNeverCacheList, request.url)) {
        // console.log('MNAZ-PWA: Current request is excluded from cache.');
        return;
      }

      // RespondWith idbResponse fun if we call our server
      if (requestUrl.origin === BACKEND_API_ORIGIN) {
        event.respondWith(idbResponse(request, store));
        return;
      }

      // avoid some potential errors
      if (requestUrl.href.includes('chrome-extension') ||
        requestUrl.pathname === '/browser-sync/socket.io/' ||
        requestUrl.href.includes('browser-sync/browser-sync-client.js')) return

      //  console.log('fetch', requestUrl);

      event.respondWith(
        caches.match(request).then((response) => {
          // console.log('Response from cache', response);
          if (response) return response;
          return fetch(request).then((response) => {
            return caches.open(cacheName).then((cache) => {
              // console.log('Add to cache & return response from NET');
              cache.put(request, response.clone()); // put clone in cache
              return response;
            })
          }).catch(error => {
            console.log('error ', error);
            console.log('fallback', request.url);
            if (request.url.indexOf('/img/') >= 0) {
              let imgurl = request.url
              imgurl = `${imgurl.substring(0, imgurl.indexOf('/img/'))}/img/offlineimg${imgurl.substring(imgurl.indexOf('-'), imgurl.length)}`;
              console.log(imgurl);

              return caches.match(imgurl);
            }
          });
        })
      );
    }
  }
});

/** 
 * Create store in IndexedDb using idb library
 */
const dbPromise = idb.open('restaurant-store', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants', {
        keyPath: 'id'
      })
      upgradeDB.createObjectStore('reviews', {
        keyPath: 'id'
      })
      upgradeDB.createObjectStore('requests', {
        keyPath: 'id'
      });
      upgradeDB.createObjectStore('post-requests', {
        keyPath: 'id'
      });
  }
})

/**
 * save Data To Idb
 * @param {Object} data 
 * @param {String} dbStoreName 
 */
function saveDataToIdb(data, dbStoreName) {
  console.log('saveDataToIdb', dbStoreName);
  
  return dbPromise.then(db => {
    if (!db) return;
    const tx = db.transaction(dbStoreName, 'readwrite');
    const store = tx.objectStore(dbStoreName);
    if (Array.isArray(data)) {
      for (const row of data) {
        store.put(row);
      }
    } else {
      store.put(data);
    }
    return tx.complete;
  }).catch(error => console.log('idb error: ', error));
}

/**
 * get Data From Idb
 * @param {String} dbStoreName 
 * @param {String} fetchError 
 */
function getDataFromIdb(dbStoreName, fetchError = '') {
  return dbPromise.then(db => {
    if (!db) throw ('DB undefined');
    const tx = db.transaction(dbStoreName);
    const store = tx.objectStore(dbStoreName);
    return store.getAll().then(data => {
      if (data.length === 0) throw ('DB: data is empty');
      console.log('Data served from DB');
      return new Response(JSON.stringify(data))
    }).catch((error) => error);

  }).catch(dbError => {
    console.log(fetchError + dbError);
    return Promise.reject(fetchError + dbError);
  });
}

/**
 * delete Data From Idb
 * @param {Number} id 
 * @param {String | Array} dbStoresName 
 */
function deleteDataFromIdb(id, dbStoresName) {
  let storesName = []
  if (!Array.isArray(dbStoresName)) {
    storesName.push(dbStoresName)
  } else {
    storesName = dbStoresName
  }
  
  return storesName.map((storeName) => {
    return dbPromise.then(db => {
    if (!db) return;
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      return store.delete(id).complete;
    })
    .catch(error => console.log('idb error: ', error));
  })
  
}

/**
 * get Data From Idb By Id
 * @param {*} storeName 
 * @param {*} id 
 */
function getDataFromIdbById(storeName, id) {
  return dbPromise.then(db => {
      if (!db) return;
      const tx = db.transaction(storeName);
      const store = tx.objectStore(storeName);
      return store.get(id);
    })
    .catch(error => console.log('idb error: ', error));
}

/**
 * update Or Save Data in Idb
 * @param {*} newData 
 * @param {*} dbStoresName 
 */
function updateOrSaveDatainIdb(newData, dbStoresName) {

  return getDataFromIdbById(dbStoresName, newData.id)
          .then((data) => {
            if (data === undefined) data = newData
            else data = Object.assign(data, newData)

            return saveDataToIdb(data, dbStoresName);
          })
}

/**
 * Response from NET, save data in DB, respond data from DB if offline
 * @param {Request object} req
 * @param {String} dbStoreName
 */
function idbResponse(req, dbStoreName) {

  return fetch(req)
    .then((response) => response.json())
    .then((data) => {
      saveDataToIdb(data, dbStoreName)
      return new Response(JSON.stringify(data))
    })
    .catch((fetchError) => {
      return getDataFromIdb(dbStoreName, fetchError)
    })
}

/* ------------------------Background Sync------------------------ */

/**
 * sync Manager
 */
function syncManager() {
  let registration = self.registration;
  if (!registration) {
    try {
      navigator.serviceWorker.getRegistration().then((reg) => {
        registration = reg
      })
    } catch (e) {}
  }
  return registration.sync;
}

function trigger(tagName) {
  return syncManager().register(tagName);
}

function serializeRequest(request, body) {
  return {
    url: request.url,
    headers: Array.from(request.headers),
    method: request.method,
    credentials: request.credentials,
    referrer: request.referrer,
    mode: request.mode === 'navigate' ? 'same-origin' : request.mode,
    body: JSON.stringify(body)
  };
}

function deserializeRequest(obj) {
  return new Request(obj.url, obj);
}

function generateUID() {
  return `${Date.now()}-${performance.now()}`;
}

/**
 * Save request and trigger Bg Sync
 * @param {*} event 
 */
function saveReqForBgSync(params) {
  if (!'SyncManager' in self) return;

  params.event.waitUntil(
    (function () {
      params.event.respondWith(new Response(null, {
        status: 302
      }));
      saveRequest(params).then(() => {
        trigger(params.syncTagName);
        send_message_to_all_clients('NotifyUserReqSaved');
      })
    })()
  )
}

/**
 * Save request and data to submit and serve it later
 * @param {*} params 
 */
function saveRequest(params) {
  const ID = params.id || generateUID()
  const request = params.event.request
  return request.json().then((data) => {
    let serRequest = serializeRequest(request, data);
    serRequest = Object.assign(serRequest, {
      id: ID
    })
    data = Object.assign(data, {
      id: ID
    })
    return (saveDataToIdb(serRequest, TAG_TO_STORE[params.syncTagName].reqs) && updateOrSaveDatainIdb(data, params.store))
  })
}

/**
 * Listener sync
 */
self.addEventListener('sync', function (event) {
  switch (event.tag) {
    case 'test-tag-from-devtools':
    case 'reviews-sync':
    case 'trigger-sync':
      bgSyncProcess(event);
      break;
    default:
      console.error(`Unknown background sync: ${event.tag}`);
  }
});

/**
 * bgSync Process
 * @param {*} event 
 */
function bgSyncProcess (event) {
  event.waitUntil(
    (function () {
      if (!(event.tag in TAG_TO_STORE)) return;
      const tagStore = TAG_TO_STORE[event.tag];

      if (tagStore.data) {
        return reSubmitRequests(tagStore.reqs, tagStore.data)
          .then(() => {
            send_message_to_all_clients('reloadThePageForMAJ')
          })
      }

      return reSubmitRequests(tagStore.reqs)
        .then(() => {
          send_message_to_all_clients('reloadThePageForMAJ')
        })
      
    })()
  );
};

/**
 * reSubmit Requests
 * @param {String} reqStore 
 * @param {String} dataStore 
 */
function reSubmitRequests(reqStore, dataStore = null) {
  const storesDeleteFrom = dataStore ? [reqStore, dataStore] : reqStore
  return getDataFromIdb(reqStore)
    .then((res) => res)
    .then((data) => data.json())
    .then((requests) => {
      return requests.map((obj) => ({
        request: deserializeRequest(obj),
        id: obj.id
      }))
    })
    .then((reqs) => {
      return Promise.all(
        reqs.map((req) => {
          try {
            fetch(req.request).then((res) => {
              return deleteDataFromIdb(req.id, storesDeleteFrom)
            })
          } catch (e) {
            console.log(e);
          }
        })
      )
    })
}

// listen for the "message" event, and call
// skipWaiting if you get the appropriate message
self.addEventListener('message', (event) => {
  if (event.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data.action == 'saveDataToIdb') {
    saveDataToIdb(event.data.value, event.data.store)
  } else {
    console.log('SW Received Message: ' + event.data);
    event.ports[0].postMessage('SW Says Hello back!');
  }
});

/**
 * send message to client
 * @param {*} client 
 * @param {String} msg 
 */
function send_message_to_client(client, msg) {
  return new Promise(function (resolve, reject) {
    const msg_chan = new MessageChannel();

    msg_chan.port1.onmessage = function (event) {
      if (event.data.error) {
        reject(event.data.error);
      } else {
        resolve(event.data);
      }
    };
    client.postMessage(msg, [msg_chan.port2]);
  });
}

/**
 * send message to all clients
 * @param {String} msg 
 */
function send_message_to_all_clients(msg) {
  return clients
    .matchAll()
    .then((clients) => {
      return Promise.all(clients.map((client) => send_message_to_client(client, msg)));
    })
    .then((res) => {
      // Response from client for sw request
      if (msg === 'isVisible') return isVisible = res[0];
      else return res || new Promise.resolve('Done');
    });
}