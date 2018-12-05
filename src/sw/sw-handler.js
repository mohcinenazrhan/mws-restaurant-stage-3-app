import idb from 'idb';

var ignoreUrlParametersMatching = [/^utm_/];
let isOffline = false,
    isVisible = false;

self.addEventListener('fetch', function (event) {
  let request = event.request,
      requestUrl = new URL(request.url);
  if (request.method === 'GET') {
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

    const customResponse = '/restaurant.html';
    if (!shouldRespond && customResponse) {
      if (requestUrl.pathname.startsWith(customResponse)) {
        // remove params from url
        url = requestUrl.href.replace(requestUrl.search, '');
        shouldRespond = urlsToCacheKeys.has(url);
      }
    }

    // If shouldRespond is still false, check to see if this is a navigation
    // request, and if so, whether the URL matches navigateFallbackWhitelist.
    var navigateFallback = '';
    if (!shouldRespond &&
      navigateFallback &&
      (event.request.mode === 'navigate') &&
      isPathWhitelisted([], event.request.url)) {
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
          return fetch(event.request);
        })
      );
    } else {

      // avoid cache mapbox, it kills the storage  
      if (requestUrl.origin === 'https://api.tiles.mapbox.com') return

      // RespondWith idbResponse fun if we call our server
      if (requestUrl.port === '1337') {
        event.respondWith(idbResponse(request, requestUrl.pathname.replace(/^\/+|\/+$/g, '')));
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
  else if (request.method === 'POST' && requestUrl.pathname === '/reviews/' && isOffline) {
    return postReview(event);
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
    case 1:
      upgradeDB.createObjectStore('reviews', {
        keyPath: 'id'
      })
    case 2:
      upgradeDB.createObjectStore('requests', {
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
    return;
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

function trigger(tagName = 'review-sync') {
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
 * Save request and data to submit and serve it later
 */
function enqueue(event) {
  const tempID = generateUID()
  return event.request.json().then((data) => {
    let request = serializeRequest(event.request, data);

    request = Object.assign(request, {
      id: tempID
    })
    data.id = tempID
    return (saveDataToIdb(request, 'requests') && saveDataToIdb(data, 'reviews'))
  })
}

/**
 * Post Review
 * @param {*} event 
 */
function postReview(event) {
  if (!'SyncManager' in self) return;

  event.waitUntil(
    (function () {
      event.respondWith(new Response(null, { status: 302 }));
      enqueue(event).then(() => {
        trigger();
        send_message_to_all_clients('MsgSyncReviews');
      })
    })()
  )
}

/**
 * Listener sync
 */
self.addEventListener('sync', function (event) {
  if (event.tag == 'review-sync') {
    event.waitUntil(
      (function () {
        return getDataFromIdb('requests')
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
                  return deleteDataFromIdb(req.id, ['requests', 'reviews'])
                })
              } catch (e) {
                console.log(e);
              }
            })
          )
        })
        .then(() => {
          send_message_to_all_clients('reloadThePageForMAJ')
        })
      })()
    );
  }
});

// listen for the "message" event, and call
// skipWaiting if you get the appropriate message
self.addEventListener('message', (event) => {
  if (event.data.action == 'skipWaiting') {
    self.skipWaiting();
  } else if (event.data.action == 'updateNetworkState') {
    isOffline = event.data.value
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
 * @param {*} msg 
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
 * @param {*} msg 
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
      else if (msg === 'isOffline') return isOffline = res[0];
      else return res || new Promise.resolve('Done');
    });
}