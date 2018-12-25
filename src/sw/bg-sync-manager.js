class BgSyncManager {
    constructor(TAG_TO_STORE, IDBHelper, msgSwToClients) {
        this.TAG_TO_STORE = TAG_TO_STORE
        this.IDBHelper = IDBHelper
        this.msgSwToClients = msgSwToClients
    }

    /**
     * sync Manager
     */
    syncManager() {
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

    trigger(tagName) {
        return this.syncManager().register(tagName);
    }

    serializeRequest(request, body) {
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

    deserializeRequest(obj) {
        return new Request(obj.url, obj);
    }

    generateUID() {
        return `${Date.now()}-${performance.now()}`;
    }

    /**
     * Save request and trigger Bg Sync
     * @param {*} event 
     */
    saveReqForBgSync(params) {
        if (!'SyncManager' in self) return;
        const event = params.event

        event.waitUntil(
            (() => {

                event.request.json().then((data) => {
                    event.respondWith(new Response(JSON.stringify(data), {
                        status: 302
                    }));
                    this.saveRequest(params, data).then(() => {
                        this.trigger(params.syncTagName);
                        this.msgSwToClients.send('NotifyUserReqSaved');
                    })
                })

            })()
        )
    }

    /**
     * Save request and data to submit and serve it later
     * @param {*} params 
     * @param {*} data 
     */
    saveRequest(params, data) {
        const ID = params.id || this.generateUID()
        const request = params.event.request

        let serRequest = this.serializeRequest(request, data);
        serRequest = Object.assign(serRequest, {
            id: ID
        })
        data = Object.assign(data, {
            id: ID
        })
        
        return (this.IDBHelper.saveDataToIdb(serRequest, this.TAG_TO_STORE[params.syncTagName].reqs) && this.IDBHelper.updateOrSaveDatainIdb(data, params.store))
    }

    /**
     * bgSync Process
     * @param {*} event 
     */
    bgSyncProcess(event) {
        event.waitUntil(
            (() => {
                if (!(event.tag in this.TAG_TO_STORE)) return;
                const tagStore = this.TAG_TO_STORE[event.tag];

                if (tagStore.data) {
                    return this.reSubmitRequests(tagStore.reqs, tagStore.data)
                        .then(() => {
                            this.msgSwToClients.send('reloadThePageForMAJ')
                        })
                }

                return this.reSubmitRequests(tagStore.reqs)
                    .then(() => {
                        this.msgSwToClients.send('reloadThePageForMAJ')
                    })

            })()
        );
    };

    /**
     * reSubmit Requests
     * @param {String} reqStore 
     * @param {String} dataStore 
     */
    reSubmitRequests(reqStore, dataStore = null) {
        const storesDeleteFrom = dataStore ? [reqStore, dataStore] : reqStore
        return this.IDBHelper.getDataFromIdb(reqStore)
            .then((res) => res)
            .then((data) => data.json())
            .then((requests) => {
                return requests.map((obj) => ({
                    request: this.deserializeRequest(obj),
                    id: obj.id
                }))
            })
            .then((reqs) => {
                return Promise.all(
                    reqs.map((req) => {
                        try {
                            fetch(req.request).then((res) => {
                                return this.IDBHelper.deleteDataFromIdb(req.id, storesDeleteFrom)
                            })
                        } catch (e) {
                            console.log(e);
                        }
                    })
                )
            })
    }
}

export default BgSyncManager;