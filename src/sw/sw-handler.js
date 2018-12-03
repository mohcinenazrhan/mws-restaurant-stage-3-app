import idb from 'idb';

var ignoreUrlParametersMatching = [/^utm_/];

self.addEventListener('fetch', function (event) {
  if (event.request.method === 'GET') {
    let request = event.request,
      requestUrl = new URL(request.url);

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
        event.respondWith(idbResponse(request));
        return;
      }

      // avoid some potential errors
      if (requestUrl.href.includes('chrome-extension') ||
        requestUrl.pathname === '/browser-sync/socket.io/' ||
        requestUrl.href.includes('browser-sync/browser-sync-client.js')) return

      // const customResponse = '/restaurant.html';
      // if (requestUrl.pathname.startsWith(customResponse))
      //   request = customResponse;

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
});

// listen for the "message" event, and call
// skipWaiting if you get the appropriate message
self.addEventListener('message', (event) => {
  if (event.data.action == 'skipWaiting') {
    self.skipWaiting();
  }
});

/** 
 * Create store in IndexedDb using idb library
 */
const dbPromise = idb.open('restaurant-store', 1, upgradeDB => {
  switch (upgradeDB.oldVersion) {
    case 0:
      upgradeDB.createObjectStore('restaurants')
  }
})

/**
 * Response from NET, save data in DB, respond data from DB if offline
 * @param {Request object} req 
 */
function idbResponse(req) {

  return fetch(req)
    .then((response) => response.json())
    .then((restaurants) => {
      dbPromise.then(db => {
        if (!db) return;
        const tx = db.transaction('restaurants', 'readwrite');
        const store = tx.objectStore('restaurants');
        for (const restaurant of restaurants) {
          store.put(restaurant, restaurant.id);
        }
      }).catch(error => console.log('idb error: ', error));

      return new Response(JSON.stringify(restaurants))
    })
    .catch((fetchError) => {
      return dbPromise.then(db => {
        if (!db) throw ('DB undefined');
        const tx = db.transaction('restaurants');
        const store = tx.objectStore('restaurants');
        return store.getAll().then(restaurants => {
          if (restaurants.length === 0) throw ('DB data is empty');
          console.log('Data served from DB');
          return new Response(JSON.stringify(restaurants))
        }).catch((error) => error);

      }).catch(dbError => {
        console.log(fetchError + dbError);
        return Promise.reject(fetchError + dbError);
      });

    })
}