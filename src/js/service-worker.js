import idb from 'idb';

const cacheName = 'restaurant-v1';

// Static asset to cache
const filesToCache = [
    '/',
    '/index.html',
    '/restaurant.html',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/css/style.css',
    '/img/offlineimg.jpg',
    '/img/offlineimg-300.jpg',
    '/img/offlineimg-400.jpg',
    '/img/offlineimg-600_2x.jpg',
    '/img/offlineimg-800_2x.jpg'
];

/**
 * When SW is installed : cache all files
 */
self.addEventListener('install', (e) => {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then( (cache) => {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        }).catch(error => {
            console.log('Caches open failed: ' + error);
        })
    );
});

/**
 * When SW activated : Delete old caches
 */
self.addEventListener('activate', (e) => {
    // console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then( (keyList) => {
            return Promise.all(keyList.map( (key) => {
                if (key !== cacheName && !key.startsWith('restaurant-')) {
                    // console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    // For taking control immediately on the first load
    return self.clients.claim();
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
function idbResponse (req) {

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

/**
 * Intercept all requests ans response with cache correspondence url data
 * Fetch from Net and save the result in cache to serve it after
 * Response to special request with optimise response
 */
self.addEventListener('fetch', (e) => {
    let request = e.request,
        requestUrl = new URL(request.url);

    
    // RespondWith idbResponse fun if we call our server
    if (requestUrl.port === '1337') {
        e.respondWith(idbResponse(request));
        return;
    }

    // avoid some potential errors
    if (requestUrl.href.includes('chrome-extension') || 
    requestUrl.pathname === '/browser-sync/socket.io/' ||
    requestUrl.href.includes('browser-sync/browser-sync-client.js') ||
    request.method !== 'GET') return

    const customResponse = '/restaurant.html';
    if (requestUrl.pathname.startsWith(customResponse))
        request = customResponse;

    // console.log('fetch', requestUrl);

    e.respondWith(
        caches.match(request).then( (response) => {
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
                if (request.url.indexOf('/img/') >= 0){
                    let imgurl = request.url
                    imgurl = `${imgurl.substring(0, imgurl.indexOf('/img/'))}/img/offlineimg${imgurl.substring(imgurl.indexOf('-'), imgurl.length)}`;
                    console.log(imgurl);
                    
                    return caches.match(imgurl);
                }
                    
            });
        })
    );
});

// listen for the "message" event, and call
// skipWaiting if you get the appropriate message
self.addEventListener('message', (event) => {
    if (event.data.action == 'skipWaiting') {
        self.skipWaiting();
    }
});