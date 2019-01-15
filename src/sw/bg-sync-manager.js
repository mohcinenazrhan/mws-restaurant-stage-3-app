class BgSyncManager {
    constructor(TAG_TO_STORE, IDBHelper, msgSwToClients, notificationIcon) {
        this.TAG_TO_STORE = TAG_TO_STORE
        this.IDBHelper = IDBHelper
        this.msgSwToClients = msgSwToClients
        this.notificationIcon = notificationIcon
        this.syncRequests = []
    }

    /**
     * sync Manager
     */
    async syncManager() {
        let registration = self.registration;
        if (!registration) {
            try {
                registration = await navigator.serviceWorker.getRegistration();
            } catch (e) {}
        }
        return registration.sync;
    }

    async trigger(tagName) {
        return (await this.syncManager()).register(tagName);
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
     * Get value json of request body
     * @param {*} request 
     */
    async getValueBodyJsonReq(request) {
        let data = null;
        await request.json().then((resData) => {
            data = resData
        })
        return data
    }

    /**
     * Save request and trigger Bg Sync
     * @param {*} event 
     */
    saveReqForBgSync(params) {
        const event = params.event;
        // For firefox cuz it doesn't support await for promise to run event.respondWith
        const cloneReq = event.request.clone();

        event.waitUntil(
            (async () => {
                event.respondWith((async () => {
                    // For firefox cuz it doesn't support await for promise to run event.respondWith
                    const data = await this.getValueBodyJsonReq(event.request);
                    return new Response(JSON.stringify(data), {
                        status: 302
                    });
                })());

                const data = await this.getValueBodyJsonReq(cloneReq);
                await this.saveRequest(params, data);
                if ('SyncManager' in self) await this.trigger(params.syncTagName);
                this.msgSwToClients.send('NotifyUserReqSaved');
            })()
        )
    }

    /**
     * Save request and data to submit and serve it later
     * @param {*} params 
     * @param {*} data 
     */
    async saveRequest(params, data) {
        const ID = params.id || this.generateUID()
        const request = params.event.request

        let serRequest = this.serializeRequest(request, data);
        serRequest = Object.assign(serRequest, {
            id: ID
        })
        data = Object.assign(data, {
            id: ID
        })
        // console.log('saveRequest', data);
        
        return await Promise.all([
            this.IDBHelper.saveDataToIdb(serRequest, this.TAG_TO_STORE[params.syncTagName].reqs),
            this.IDBHelper.updateOrSaveDatainIdb(data, params.store)
        ])
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
                this.process(tagStore);
            })()
        );
    };

    /**
     * Run process
     * @param {*} tagStore 
     */
    async process(tagStore) {
        if (tagStore.data) {
            await this.reSubmitRequests(tagStore.reqs, tagStore.data);
            await this.msgSwToClients.send('isVisible')
                .then((isVisible) => {
                    if (isVisible === false)
                        this.pushNotification(tagStore.data, this.syncRequests);
                    else
                        this.msgSwToClients.send('reloadThePageForMAJ');
                })
        } else {
            await this.reSubmitRequests(tagStore.reqs);
            this.msgSwToClients.send('reloadThePageForMAJ');
        }
    }

    /**
     * BG Sync polyfill
     */
    async bgSyncPolyfill() {
        for (const tag in this.TAG_TO_STORE) {
            if (this.TAG_TO_STORE.hasOwnProperty(tag)) {
                const tagStore = this.TAG_TO_STORE[tag];
                const isEmpty = await this.IDBHelper.isDataDbEmpty(tagStore.reqs);
                if (!isEmpty) this.process(tagStore);
            }
        }
    }

    /**
     * reSubmit Requests
     * @param {String} reqStore 
     * @param {String} dataStore 
     */
    reSubmitRequests(reqStore, dataStore = null) {
        const storesDeleteFrom = dataStore ? [reqStore, dataStore] : reqStore
        return this.IDBHelper.getDataFromIdb(reqStore)
            .then((requests) => {
                return requests.map((obj) => ({
                    request: this.deserializeRequest(obj),
                    id: obj.id
                }))
            })
            .then((reqs) => {
                this.syncRequests = reqs

                return Promise.all(
                    reqs.map(async (req) => {
                        try {
                            await fetch(req.request);
                            await this.IDBHelper.deleteDataFromIdb(req.id, storesDeleteFrom);
                            return true;
                        } catch (e) {
                            console.log(e);
                        }
                    })
                )
            })
    }

    pushNotification(subject, syncRequests) {
        let last = '' // for distinct notification
        syncRequests
            .sort((r1, r2) => r1.request.referrer > r2.request.referrer ? 1 : -1)
            .map((obj) => {
                const lastreferrer = last
                last = obj.request.referrer
                if (obj.request.referrer === lastreferrer) return;

                self.registration.showNotification(`Your ${subject} are submited`, {
                    body: `Ckeck your ${subject}`,
                    icon: this.notificationIcon,
                    vibrate: [200, 100, 200, 100, 200, 100, 200],
                    tag: obj.request.referrer
                });
            });
    }
}

export default BgSyncManager;