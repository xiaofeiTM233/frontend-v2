import Vue from 'vue'
import Vuex from 'vuex'
import createPersistedState from 'vuex-persistedstate'

import itemsManager from '@/models/items'
import limitationsManager from '@/models/limitations'
import stagesManager from '@/models/stages'
import zonesManager from '@/models/zones'
import trendsManager from '@/models/trends'
import globalMatrixManager from '@/models/matrices/globalMatrix'
import personalMatrixManager from '@/models/matrices/personalMatrix'

Vue.use(Vuex);

export default new Vuex.Store({
  plugins: [
    createPersistedState({
      key: "penguin-stats-state"
    })
  ],
  state: {
    data: {},
    ajax: {
      pending: false,
      success: true,
      error: null
    },
    settings: {
      dark: true,
      locale: 'zh'
    },
    auth: {
      username: null
    },
    cacheUpdateAt: {},
    dataSource: 'global'
  },
  mutations: {
    store: (state, d) => {
      state.data = Object.assign(state.data, d);
    },
    storeCacheUpdateAt: (state, d) => {
      state.cacheUpdateAt = Object.assign(state.cacheUpdateAt, d);
    },
    switchDataSource: (state, value) => {
      state.dataSource = value;
    },
    switchDark(state, newState) {
      state.settings.dark = newState
    },
    changeLocale(state, newLocale) {
      state.settings.locale = newLocale
    },
    authLogin(state, username) {
      state.auth.username = username
    },
    authLogout(state) {
      state.auth.username = null
    },
    ajaxFired(state) {
      state.ajax.pending = true;
    },
    ajaxSucceeded(state) {
      state.ajax.pending = false;
      state.ajax.success = true;
      state.ajax.error = null
    },
    ajaxFailed(state, errorMessage) {
      state.ajax.pending = false;
      state.ajax.success = false;
      state.ajax.error = errorMessage
    }
  },
  actions: {
    // eslint-disable-next-line
    async fetchData({}, refresh = false) {
      await itemsManager.get(refresh)
      await limitationsManager.get(refresh)
      await stagesManager.get(refresh)
      await zonesManager.get(refresh)
      await trendsManager.get(refresh)
      await globalMatrixManager.get(refresh)
      await personalMatrixManager.get(refresh)
    },
    async refreshPersonalMatrixData() {
      await personalMatrixManager.get(true)
    }
  },
  getters: {
    authed: state => {
      return !!state.auth.username
    },
    authUsername: state => {
      return state.auth.username || ''
    },
    ajax: state => {
      return state.ajax
    },
    dataByKey: (state) => (id) => {
      return state.data[id]
    },
    cacheUpdateAt: (state) => (name) => {
      return state.cacheUpdateAt[name]
    }
  }
})