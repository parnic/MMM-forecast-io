var NodeHelper = require('node_helper');
const log = require('logger');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

module.exports = NodeHelper.create({
    getUrl: function() {
        if (!this.config) {
            return "";
        }

        var units = this.config.unitTable[this.config.units] || 'auto';
        let url = `${this.config.apiBase}/${this.config.apiKey}/${this.config.latitude},${this.config.longitude}?units=${units}&lang=${this.config.language}`;
        return url;
    },

    fetchForecast: async function() {
        const url = this.getUrl();
        log.info(`[MMM-forecast-io] fetching ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            log.error('[MMM-forecast-io] unable to retrieve weather - !response.ok');
            return;
        } else if (response.status != 200) {
            log.error(`[MMM-forecast-io] unable to retrieve weather - unexpected status code ${response.status}`);
            return;
        }

        this.lastForecast = await response.json();
        log.info('[MMM-forecast-io]   success! notifying client');
        this.sendSocketNotification('FORECAST-IO-READY', this.lastForecast);
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === 'FORECAST-IO-CONFIG') {
            let firstRegistrar = !this.config;
            this.config = payload;
            if (firstRegistrar) {
                this.fetchForecast();
                setInterval(() => this.fetchForecast(), this.config.updateInterval);
            } else if (this.lastForecast) {
                this.sendSocketNotification('FORECAST-IO-READY', this.lastForecast);
            }
        }
    }
});
