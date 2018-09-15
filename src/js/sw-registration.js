let refreshing = false;

/**
 * Service worker registration & Update Process
 */
function serviceWorkerRegistration() {
    if (!navigator.serviceWorker) return;

    // listen for the controlling service worker changing
    // and reload the page
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;

        window.location.reload();
        refreshing = true;
    })

    navigator.serviceWorker
        .register('./service-worker.js')
        .then((reg) => {
            console.log('Service Worker Registered');

            // if there's no controller, this page wasn't loaded
            // via a service worker, so they're looking at the latest version.
            // In that case, exit early
            if (!navigator.serviceWorker.controller) return;

            // if there's an updated worker already waiting, call
            if (reg.waiting) {
                updateReady();
                return;
            }

            // if there's an updated worker installing, track its
            // progress. If it becomes "installed", call
            if (reg.installing) {
                trackingprogressInstalled(reg.installing);
                return;
            }

            // otherwise, listen for new installing workers arriving.
            // If one arrives, track its progress.
            // If it becomes "installed", call
            reg.addEventListener('updatefound', () => {
                trackingprogressInstalled(reg.installing);
            });

        })
        .catch(error => console.log('Service worker not registered: ', error));
}

// Fire Service Worker Registration
serviceWorkerRegistration();

/**
 * Update notification Service Worker
 * @param {Object} worker 
 */
function updateReady(worker) {
    const ok = confirm('New version available online. Do you want to update? ');
    if (ok) {
        worker.postMessage({
            action: 'skipWaiting'
        });
    };
}

/**
 * Update notification & Traking Service Worker
 * @param {Object} worker 
 */
function trackingprogressInstalled(worker) {
    worker.addEventListener('statechange', () => {
        if (worker.state == 'installed') {
            updateReady(worker);
        }
    });
}