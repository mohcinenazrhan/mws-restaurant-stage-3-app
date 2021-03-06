import idb from 'idb';

export default class IDBHelper {
    constructor() {
        this.idbPromise = this.openDatabase();
    }

    /**
     * Open a IDB database, create an objectStore,
     * @return {Promise} - idbPromise to access database
     */
    openDatabase() {
        // If the browser doesn't support service worker,
        // we don't care about having a database
        if (!navigator.serviceWorker) {
            return Promise.resolve();
        }

        return idb.open('restaurant-store', 2, upgradeDB => {
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
                case 1:
                    const reviewsStore = upgradeDB.transaction.objectStore('reviews');
                    reviewsStore.createIndex('restaurant_id', 'restaurant_id');
            }
        })

    }

    /**
     * save Data To Idb
     * @param {Object} data 
     * @param {String} dbStoreName 
     */
    async saveDataToIdb(data, dbStoreName) {
        if (!('serviceWorker' in navigator)) return;
        
        const isEmpty = await this.isDataDbEmpty(dbStoreName);
        if (isEmpty) {
            // console.log('saveDataToIdb client side', dbStoreName);
            try {
                const db = await this.idbPromise;
                if (!db) throw ('DB undefined');
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
            } catch (error) {
                console.log('idb error: ', error);
            }
        }
    }

    /**
     * get Data state: empty or filled
     * @param {String} dbStoreName 
     * @param {String} fetchError 
     */
    async isDataDbEmpty(dbStoreName) {
        try {
            const db = await this.idbPromise;
            if (!db) throw ('DB undefined');
            const tx = db.transaction(dbStoreName);
            const store = tx.objectStore(dbStoreName);
            return store.count().then(count => {
                if (count === 0) return true
                return false
            }).catch((error) => console.log(error));
        } catch (error) {
            console.log('idb error: ', error);
        }
    }
}