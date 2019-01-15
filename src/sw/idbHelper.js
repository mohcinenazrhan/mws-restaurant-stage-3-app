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
    async saveDataToIdb(data, dbStoreName) {
        console.log('saveDataToIdb', dbStoreName, data);
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

    /**
     * get Data From Idb
     * @param {String} dbStoreName 
     * @param {String} fetchError 
     */
    async getDataFromIdb(dbStoreName, keyValue = null) {        
        if (keyValue !== null) {
            if (keyValue.index === null && !isNaN(keyValue.id)) {
                return this.getDataFromIdbById(dbStoreName, keyValue.id)
            }
            else if (keyValue.index !== null && !isNaN(keyValue.id)) {
                return this.getAllItemsFromIndex(dbStoreName, keyValue.index, keyValue.id)
            }
        }

        try {
            const db = await this.idbPromise;
            if (!db) throw ('DB undefined');
            const tx = db.transaction(dbStoreName);
            const store = tx.objectStore(dbStoreName);
            return store.getAll()
                        .then(data => {
                            // just for debugging
                            if (data.length === 0) console.log('DB: data is empty');

                            console.log('Data served from DB');
                            return data;
                        }).catch((error) => error);

        } catch (error) {
            console.log('idb error: ', error);
        }
    }

    /**
     * delete Data From Idb
     * @param {Number} id 
     * @param {String | Array} dbStoresName 
     */
    async deleteDataFromIdb(id, dbStoresName) {
        let storesName = []
        if (!Array.isArray(dbStoresName)) {
            storesName.push(dbStoresName)
        } else {
            storesName = dbStoresName
        }

        try {
            const db = await this.idbPromise;
            if (!db) throw ('DB undefined');
            return storesName.map(async (storeName) => {
                return await db.transaction(storeName, 'readwrite')
                                .objectStore(storeName)
                                .delete(id).complete;
            })
        } catch (error) {
            console.log('idb error: ', error);
        }
    }

    /**
     * get Data From Idb By Id
     * @param {*} storeName 
     * @param {*} id 
     */
    async getDataFromIdbById(storeName, id) {
        try {
            const db = await this.idbPromise;
            if (!db) throw ('DB undefined');
            const tx = db.transaction(storeName);
            const store = tx.objectStore(storeName);
            return store.get(id).then(data => {
                if (data === undefined) data = {};
                return data
            }).catch((error) => console.log(error));

        } catch (error) {
            console.log('idb error: ', error);
        }
    }

    /**
     * gets all items from an index with key (if it is given)
     * @param {String} storeName - The name of the store to open
     * @param {String} indexName - The name of the index to open
     * @param {*} key - key to get items with (optional)
     */
    async getAllItemsFromIndex(storeName, indexName, key) {
        try {
            const db = await this.idbPromise;
            if (!db) throw ('DB undefined');
            const tx = db.transaction(storeName);
            const index = tx.objectStore(storeName).index(indexName);
             console.log(
                 `Getting all items from store'${storeName}' by index ${indexName} with ${key ||
                    'no key'}`
             );
            if (key) return index.getAll(key).then(data => {
                if (data.length === 0) console.log(storeName + ' DB: data is empty');
                return data;
            }).catch((error) => console.log(error));

            return index.getAll().then(data => {
                if (data.length === 0) console.log(storeName + ' DB: data is empty');
                return data;
            }).catch((error) => console.log(error));

        } catch (error) {
            console.log('idb error: ', error);
        }
    }

    /**
     * update Or Save Data in Idb
     * @param {*} newData 
     * @param {*} dbStoresName 
     */
    async updateOrSaveDatainIdb(newData, dbStoresName) {
        let data = await this.getDataFromIdbById(dbStoresName, newData.id)
        
        console.log('before', data);
        console.log('newData.id', newData.id);
        console.log('dbStoresName', dbStoresName);

        if (data === undefined) data = newData
        else data = Object.assign(data, newData)

        console.log('updateOrSaveDatainIdb', data);

        return this.saveDataToIdb(data, dbStoresName);
    }

    /**
     * get Data state: empty or filled
     * @param {String} dbStoreName 
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

    /**
     * Remove removed data from Idb and save new data it in Idb
     * @param {*} neWdata 
     * @param {*} dbStoreName 
     * @param {*} keyValue 
     */
    async removeDiffDataAndSaveInIdb(neWdata, dbStoreName, savedDbData) {
        try {
            
            if (Array.isArray(savedDbData)) {
                const newIds = neWdata.map((obj) => obj.id);
                const db = await this.idbPromise;
                if (!db) throw ('DB undefined');
                const tx = db.transaction(dbStoreName, 'readwrite');
                const store = tx.objectStore(dbStoreName);

                savedDbData.map((obj) => {
                    if (!newIds.includes(obj.id))
                        store.delete(obj.id);
                })
            }

            this.saveDataToIdb(neWdata, dbStoreName);

        } catch (error) {
            console.log('idb error: ', error);
        }
    }
}

export default new IDBHelper();