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
  send_message_to_client: function(client, msg) {
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
        if (msg === 'isVisible') return isVisible = res[0];
        else return res || new Promise.resolve('Done');
      });
  },
  send: function(msg) {
    return this.send_message_to_all_clients(msg);
  }
}

// Import modules
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

const _bgSyncManager = new BgSyncManager(TAG_TO_STORE, IDBHelper, msgSwToClients);

var ignoreUrlParametersMatching = [/^utm_/];
let isVisible = false;

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

/**
 * Intercept all requests ans response with cache correspondence url data
 * Fetch from Net and save the result in cache to serve it after
 * Response to special request with optimise response
 */
self.addEventListener('fetch', function (event) {
  let request = event.request,
      requestUrl = new URL(request.url);
  const urlParams = requestUrl.pathname.replace(/^\/+|\/+$/g, '').split('/')
  const store = urlParams[0];
  const methods = ['POST', 'PUT'];

  if (navigator.onLine === false && methods.includes(request.method)) {
    if (request.method === 'POST' && store === 'reviews') {
      return _bgSyncManager.saveReqForBgSync({
        event,
        store,
        syncTagName: 'reviews-sync'
      });
    }

    if (request.method === 'PUT' && store === 'restaurants') {
      return _bgSyncManager.saveReqForBgSync({
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
        IDBHelper.saveDataToIdb(data, store);
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

      // Return if request url is from an external domain.
      if (requestUrl.origin !== location.origin) {
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
 * Response from NET, save data in DB, respond data from DB if offline
 * @param {Request object} req
 * @param {String} dbStoreName
 */
function idbResponse(req, dbStoreName) {

  return fetch(req)
    .then((response) => response.json())
    .then((data) => {
      IDBHelper.saveDataToIdb(data, dbStoreName)
      return new Response(JSON.stringify(data))
    })
    .catch((fetchError) => {
      return IDBHelper.getDataFromIdb(dbStoreName, fetchError)
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
  if (event.data.action == 'skipWaiting') {
    // skipWaiting if you get the appropriate message
    self.skipWaiting();
  } else if (event.data.action == 'saveDataToIdb') {
    IDBHelper.saveDataToIdb(event.data.value, event.data.store)
  } else {
    console.log('SW Received Message: ' + event.data);
    event.ports[0].postMessage('SW Says Hello back!');
  }
});