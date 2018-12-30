import idb from 'idb';

class IDBHelper {
    constructor() {
        this.idbPromise = this.openDatabase('restaurant-store', 2);
    }

    /**
     * Open a IDB database, create an objectStore,
     * @return {Promise} - idbPromise to access database
     */
    openDatabase(dbName, version) {
        return idb.open(dbName, version);
    }

    /**
     * save Data To Idb
     * @param {Object} data 
     * @param {String} dbStoreName 
     */
    saveDataToIdb(data, dbStoreName) {
        console.log('saveDataToIdb', dbStoreName);

        return this.idbPromise.then(db => {
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
    getDataFromIdb(dbStoreName, keyValue = null) {        
        if (keyValue !== null) {
            if (keyValue.index === null && !isNaN(keyValue.id)) {
                return this.getDataFromIdbById(dbStoreName, keyValue.id)
            }
            else if (keyValue.index !== null && !isNaN(keyValue.id)) {
                return this.getAllItemsFromIndex(dbStoreName, keyValue.index, keyValue.id)
            }
        }

        return this.idbPromise.then(db => {
            if (!db) throw ('DB undefined');
            const tx = db.transaction(dbStoreName);
            const store = tx.objectStore(dbStoreName);
            return store.getAll().then(data => {
                // if (data.length === 0) throw ('DB: data is empty');
                if (data.length === 0) console.log('DB: data is empty');
                console.log('Data served from DB');
                return new Response(JSON.stringify(data))
            }).catch((error) => error);

        }).catch(dbError => {
            console.log(dbError);
            return Promise.reject(dbError);
        });
    }

    /**
     * delete Data From Idb
     * @param {Number} id 
     * @param {String | Array} dbStoresName 
     */
    deleteDataFromIdb(id, dbStoresName) {
        let storesName = []
        if (!Array.isArray(dbStoresName)) {
            storesName.push(dbStoresName)
        } else {
            storesName = dbStoresName
        }

        return storesName.map((storeName) => {
            return this.idbPromise.then(db => {
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
    getDataFromIdbById(storeName, id) {
        return this.idbPromise.then(db => {
                if (!db) return;
                const tx = db.transaction(storeName);
                const store = tx.objectStore(storeName);
                return store.get(id).then(data => {
                    if (data.length === 0) console.log(storeName + ' DB: data is empty');
                    return new Response(JSON.stringify(data))
                }).catch((error) => error);
            })
            .catch(error => console.log('idb error: ', error));
    }

    /**
     * gets all items from an index with key (if it is given)
     * @param {String} storeName - The name of the store to open
     * @param {String} indexName - The name of the index to open
     * @param {*} key - key to get items with (optional)
     */
    getAllItemsFromIndex(storeName, indexName, key) {
        return this.idbPromise.then(db => {
                if (!db) return;
                const tx = db.transaction(storeName);
                const index = tx.objectStore(storeName).index(indexName);
                console.log(
                    `Getting all items from store'${storeName}' by index ${indexName} with ${key ||
                    'no key'}`
                );
                if (key) return index.getAll(key).then(data => {
                    if (data.length === 0) console.log(storeName + ' DB: data is empty');
                    return new Response(JSON.stringify(data))
                }).catch((error) => error);

                return index.getAll().then(data => {
                    if (data.length === 0) console.log(storeName + ' DB: data is empty');
                    return new Response(JSON.stringify(data))
                }).catch((error) => error);
            })
            .catch(error => console.log('idb error: ', error));
    }

    /**
     * update Or Save Data in Idb
     * @param {*} newData 
     * @param {*} dbStoresName 
     */
    updateOrSaveDatainIdb(newData, dbStoresName) {

        return this.getDataFromIdbById(dbStoresName, newData.id)
            .then((data) => {
                if (data === undefined) data = newData
                else data = Object.assign(data, newData)

                return this.saveDataToIdb(data, dbStoresName);
            })
    }
}

export default new IDBHelper();