//! MNAZ-PWA Service Worker
//! version : 1.0.0
//! author  : MNAZ - Mohcine NAZRHAN
//! support : Cache/Background Sync/IndexedDB

/**
 * send msg from Sw To Clients and response promise Helper
 */
const msgSwToClients = {
  /**
   * send message to client
   * @param {*} client 
   * @param {String} msg 
   */
  send_message_to_client: function (client, msg) {
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
  },

  /**
   * send message to all clients
   * @param {String} msg 
   */
  send_message_to_all_clients: function (msg) {
    return clients
      .matchAll()
      .then((clients) => {
        return Promise.all(clients.map((client) => this.send_message_to_client(client, msg)));
      })
      .then((res) => {
        // Response from client for sw request
        if (msg === 'isVisible') return res[0];
        else return res || new Promise.resolve('Done');
      });
  },
  send: function (msg) {
    return this.send_message_to_all_clients(msg);
  }
}

// Import modules
import '@babel/polyfill';
import IDBHelper from '../../src/sw/idbHelper'; // to adapte it to gulp task
import BgSyncManager from '../../src/sw/bg-sync-manager'; // to adapte it to gulp task

const TAG_TO_STORE = {
  'trigger-sync': {
    reqs: 'requests'
  },
  'reviews-sync': {
    reqs: 'post-requests',
    data: 'reviews'
  }
};
const notificationIcon = 'http://icons.iconarchive.com/icons/graphicloads/100-flat/256/home-icon.png';

const _bgSyncManager = new BgSyncManager(TAG_TO_STORE, IDBHelper, msgSwToClients, notificationIcon);

var ignoreUrlParametersMatching = [/^utm_/];

const navigateFallbackWhitelist = [/^\/restaurant/];
const navigateFallback = '/404.html'; // Just to test this feature

const BACKEND_API_ORIGIN = 'APIORIGIN';

const imgSizes = ['-800_2x', '-600_2x', '-400', '-300'];
const regexToReplaceWithWhite = /-\d+(_2x|)/g;
const restaurantOfflineImg = self.location.origin + '/offlineimgs/offlineimg.jpg';

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
function getUrlParameter(search, sParam, exactName = true) {
  const sPageURL = search.substring(1),
    sURLVariables = sPageURL.split('&');
  let sParameterName, i;

  for (i = 0; i < sURLVariables.length; i++) {
    sParameterName = sURLVariables[i].split('=');
    if (exactName) {
      if (sParameterName[0] === sParam) {
        return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
      }
    } else {
      if (sParameterName[0].includes(sParam)) {
        return {
          index: sParameterName[0],
          id: sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1])
        }
      }
    }
  }
};

/**
 * Intercept all requests ans response with cache correspondence url data
 * Fetch from Net and save the result in cache to serve it after
 * Response to special request with optimise response
 */
self.addEventListener('fetch', function (event) {
  let request = event.request,
    requestUrl = new URL(request.url);
  const urlParams = requestUrl.pathname.replace(/^\/+|\/+$/g, '').split('/')
  const methods = ['POST', 'PUT'];
  const store = urlParams[0];

  if (navigator.onLine === false && methods.includes(request.method)) {
    return _bgSyncManager.saveReqForBgSync({
      event,
      store,
      id: parseInt(urlParams[1]),
      syncTagName: (`${store}-sync` in TAG_TO_STORE) ? `${store}-sync` : 'trigger-sync'
    });
  } else if (methods.includes(request.method)) {
    event.respondWith(fetch(request)
      .then((response) => response.json())
      .then((data) => {
        IDBHelper.saveDataToIdb(data, store);
        return new Response(JSON.stringify(data))
      }))
  } else if (request.method === 'GET') {
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
      event.respondWith((async () => {
        try {
          const cache = await caches.open(cacheName);
          const cachedResponse = await cache.match(urlsToCacheKeys.get(url));
          if (cachedResponse) return cachedResponse;
          else throw Error('The cached response that was expected is missing.');
        } catch (error) {
          // Fall back to just fetch()ing the request if some unexpected error
          // prevented the cached response from being valid.
          console.warn('Couldn\'t serve response for "%s" from cache: %O', event.request.url, error);
          return fetch(event.request)
        }
      })());
    } else {

      // Return if the current request url is in the never cache list
      if (!neverCacheUrls.every(checkNeverCacheList, request.url)) {
        // console.log('MNAZ-PWA: Current request is excluded from cache.');
        return;
      }

      // RespondWith idbResponse fun if we call our server
      if (requestUrl.origin === BACKEND_API_ORIGIN) {

        let idFromSearch = requestUrl.search !== '' ? getUrlParameter(requestUrl.search, 'id', false) : null;
        idFromSearch !== null && idFromSearch !== undefined ? idFromSearch.id = parseInt(idFromSearch.id) : idFromSearch;
        // console.log('idFromSearch', idFromSearch);

        const idFromUrl = urlParams[1] !== '' && urlParams[1] !== undefined ? {
          index: null,
          id: parseInt(urlParams[1])
        } : null;
        // console.log('idFromUrl', idFromUrl);

        const keyValue = idFromUrl || idFromSearch || null
        // if (requestUrl.port !== '1337') return
        // console.log('requestUrl', requestUrl);
        // console.log('urlParams', urlParams);
        // console.log('idFromUrl', idFromUrl);
        // return
        event.respondWith(idbResponse(request, store, keyValue));
        return;
      }

      // Return if request url is from an external domain.
      if (requestUrl.origin !== location.origin) {
        return;
      }

      // avoid some potential errors
      if (requestUrl.href.includes('chrome-extension') ||
        requestUrl.pathname === '/browser-sync/socket.io/' ||
        requestUrl.href.includes('browser-sync/browser-sync-client.js')) return

      //  console.log('fetch', requestUrl);

      event.respondWith((async () => {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) return cachedResponse;

        try {
          const response = await fetch(request);
          const cache = await caches.open(cacheName);
          // console.log('Add to cache & return response from NET');
          cache.put(request, response.clone()); // put clone in cache
          return response;
        } catch (error) {
          console.log('fetch error ', error);
          console.log('fallback ', request.url);
          if (requestUrl.pathname.startsWith('/img/')) {
            return serveRestaurantImgs(event.request);
          }
        }
      })());
    }
  }
});

/**
 * Serve restaurant imgs fallback
 * @param {*} request 
 */
async function serveRestaurantImgs(request) {
  // as: 5-800_2x.jpg
  const imageUrl = request.url;
  let storageUrl = imageUrl.replace(regexToReplaceWithWhite, ''); // as: 5.jpg
  console.log('storageUrl', storageUrl);

  // search for original image without (size in name) 
  // not all the browsers support 'srcset'
  let cachedResponse = await caches.match(storageUrl);
  console.log('cachedResponse', cachedResponse);
  if (cachedResponse) return cachedResponse;

  // loop over imgSiezs ['-800_2x', '-600_2x', '-400', '-300']
  // loop from big size to smaller
  // return the first images founded
  for (let i = 0; i < imgSizes.length; i++) {
    storageUrl = imageUrl.replace(regexToReplaceWithWhite, imgSizes[i])
    console.log('storageUrl', storageUrl);

    cachedResponse = await caches.match(storageUrl);
    console.log('cachedResponse', cachedResponse);
    if (cachedResponse) return cachedResponse;
  }

  // if there is no images of all sizes in cache,
  // response with (image not available offline) image
  return caches.match(urlsToCacheKeys.get(restaurantOfflineImg));
}

/**
 * Response from DB, respond data from NET to compare with DB data and then save data in DB
 * @param {Request object} req
 * @param {String} dbStoreName
 */
function idbResponse(req, dbStoreName, keyValue) {
  // console.log(req, dbStoreName, keyValue);

  return IDBHelper.getDataFromIdb(dbStoreName, keyValue)
    // .then((res) => res.json())
    .then((dbData) => {
      // retrieve object that have storageLocal property for a fair comparison with net
      const savedDbData = retrieveByProperty(dbData, 'storageLocal', 'object');

      const fetchData = fetch(req)
        .then((response) => response.json())
        .then((data) => {
          // temporary fix to avoid issues
          // retrieve storageLocal property for a fair comparison with local db
          // TODO: make the API avoid addition properties storageLocal
          data = retrieveByProperty(data, 'storageLocal', 'property');

          IDBHelper.saveDataToIdb(data, dbStoreName)

          // comparison between data from NET and localDb
          // make the comparison only if localDb has data
          const dataLength = savedDbData.length || Object.keys(savedDbData).length;
          if (dataLength >= 1) {
            if (JSON.stringify(data) !== JSON.stringify(savedDbData))
              msgSwToClients.send('updateContent') // update content
          }

          return new Response(JSON.stringify(data))
        })
        .catch(() => {
          return IDBHelper.getDataFromIdb(dbStoreName)
        })

      // undefined to get data from fetchData
      // get data from fetchData if local data is empty and we are online
      // if we are offline just response what we get from local db
      dbData = dbData.length === 0 && navigator.onLine ? undefined : new Response(JSON.stringify(dbData))
      return dbData || fetchData
    })
    .catch((error) => {
      console.log(error);
    })
}

/**
 * Retrieve property or object from data by property name given
 * @param {Array | Object} data
 * @param {String} property 
 * @param {String} whatRetrieve // property | object
 */
function retrieveByProperty(data, property, whatRetrieve) {
  if (whatRetrieve === 'property') {
    if (Array.isArray(data)) {
      data = data.map((obj) => {
        if (obj.hasOwnProperty(property)) delete obj[property]

        return obj
      })
    } else if (data.constructor === Object) {
      if (data.hasOwnProperty(property)) delete data[property]
    }
  } else if (whatRetrieve === 'object') {
    if (Array.isArray(data)) {
      data = data.filter((obj) => !obj.hasOwnProperty(property))
    } else if (data.constructor === Object) {
      if (data.hasOwnProperty(property))
        data = {}
    }
  }

  return data
}

/**
 * Listener sync
 */
self.addEventListener('sync', (event) => {
  console.log(event.tag);
  switch (event.tag) {
    case 'test-tag-from-devtools':
    case 'reviews-sync':
    case 'trigger-sync':
      _bgSyncManager.bgSyncProcess(event);
      break;
    default:
      console.error(`Unknown background sync: ${event.tag}`);
  }
});

/**
 * listen for the "message" event, and call
 */
self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    // skipWaiting if you get the appropriate message
    self.skipWaiting();
  } else if (event.data.action === 'bgSyncPolyfill') {
    _bgSyncManager.bgSyncPolyfill();
  }
});

/**
 * notification click
 */
self.addEventListener('notificationclick', function (event) {
  console.log(event.notification.tag);
  const referrer = event.notification.tag;
  event.notification.close();
  event.waitUntil(clients.openWindow(referrer));
});