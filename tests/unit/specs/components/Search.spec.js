import Vue from 'vue'
import Vuex from 'vuex'
import VueI18n from 'vue-i18n'
import VueProgressBar from 'vue-progressbar'
import BootstrapVue from 'bootstrap-vue'
import { mount, createLocalVue } from '@vue/test-utils'

import noop from 'lodash/noop'
import trim from 'lodash/trim'

import esConnectionHelper from 'tests/unit/specs/utils/esConnectionHelper'
import messages from '@/messages'
import router from '@/router'
import store from '@/store'

import FontAwesomeIcon from '@/components/FontAwesomeIcon'
import Search from '@/components/Search'
import { IndexedDocuments, IndexedDocument, letData } from 'tests/unit/es_utils'
import fetchPonyfill from 'fetch-ponyfill'
import DatashareClient from '@/api/DatashareClient'

const localVue = createLocalVue()
localVue.use(VueI18n)
localVue.use(Vuex)
localVue.use(VueProgressBar, { color: '#852308' })
localVue.use(BootstrapVue)
localVue.component('font-awesome-icon', FontAwesomeIcon)
const i18n = new VueI18n({ locale: 'en', messages })
const { Response } = fetchPonyfill()

jest.mock('@/api/DatashareClient', () => jest.fn())
DatashareClient.mockImplementation(() => {
  return {
    getIndices: () => {
      return Promise.resolve(new Response(JSON.stringify([]),
        { status: 200, headers: { 'Content-type': 'application/json' } }))
    }
  }
})

describe('Search.vue', function () {
  esConnectionHelper()
  var es = esConnectionHelper.es
  var wrapped = null
  // High timeout because multiple searches can be heavy for the Elasticsearch
  jest.setTimeout(1e4)

  beforeAll(() => {
    // Remove all facets to avoid unecessary request
    store.commit('search/clear')
  })

  beforeEach(async () => {
    Search.created = noop
    Vue.prototype.config = { dataDir: '/home/user/data' }
    wrapped = mount(Search, { localVue, i18n, router, store })
    store.commit('search/clear')
  })

  it('should display no documents found', async () => {
    await wrapped.vm.search('foo')
    await wrapped.vm.$nextTick()

    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__number-of-results').textContent)).toEqual('No documents found.')
  })

  it('should display one document found', async () => {
    await letData(es).have(new IndexedDocument('docs/bar.txt').withContent('this is bar document')).commit()

    await wrapped.vm.search('bar')
    await wrapped.vm.$nextTick()

    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress__pagination').textContent)).toEqual('1 - 1')
    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress_number-of-results').textContent)).toEqual('on 1 document found')
    expect(trim(wrapped.vm.$el.querySelector('.search-results-item__fragments').innerHTML)).toEqual('this is <mark>bar</mark> document')
  })

  it('should display 2 documents found', async () => {
    await letData(es).have(new IndexedDocument('docs/bar1.txt').withContent('this is bar 1 document')).commit()
    await letData(es).have(new IndexedDocument('docs/bar2.txt').withContent('this is bar 2 document')).commit()

    await wrapped.vm.search('bar')
    await wrapped.vm.$nextTick()

    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress__pagination').textContent)).toEqual('1 - 2')
    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress_number-of-results').textContent)).toEqual('on 2 documents found')
    expect(wrapped.vm.$el.querySelectorAll('.search-results-item').length).toEqual(2)
  })

  it('should make a link without routing for a document', async () => {
    await letData(es).have(new IndexedDocument('doc.txt').withContent('this is a document')).commit()

    await wrapped.vm.search('document')
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelector('.search-results-item__basename a').href).toMatch(/doc.txt$/)
  })

  it('should make a link with routing for a child document', async () => {
    await letData(es).have(new IndexedDocument('parent.txt').withContent('this is a parent document')).commit()
    await letData(es).have(new IndexedDocument('child.txt').withContent('this is a children document').withParent('parent.txt')).commit()

    await wrapped.vm.search('children')
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelector('.search-results-item__basename a').href).toMatch(/child.txt\/parent.txt/)
  })

  it('should return 2 documents', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await wrapped.vm.search({ query: 'document', from: 0, size: 2 })
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results-item').length).toEqual(2)
  })

  it('should return 3 documents', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await wrapped.vm.search({ query: 'document', from: 0, size: 3 })
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results-item').length).toEqual(3)
  })

  it('should not display the pagination (1/2)', async () => {
    await wrapped.vm.search('foo')
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__first-page').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__previous-page').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__next-page').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__last-page').length).toEqual(0)
  })

  it('should not display the pagination (2/2)', async () => {
    await letData(es).have(new IndexedDocument('doc_01.txt').withContent('this is the first document')).commit()

    await wrapped.vm.search('document')
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__first-page').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__previous-page').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__next-page').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__last-page').length).toEqual(0)
  })

  it('should display the pagination', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await wrapped.vm.search({ query: 'document', from: 0, size: 3 })
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__first-page').length).toEqual(2)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__previous-page').length).toEqual(2)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__next-page').length).toEqual(2)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__last-page').length).toEqual(2)
    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress__pagination').textContent)).toEqual('1 - 3')
    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress_number-of-results').textContent)).toEqual('on 4 documents found')
    expect(wrapped.vm.$el.querySelectorAll('.search-results-item').length).toEqual(3)
  })

  it('should display the first and the previous page as unavailable', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await wrapped.vm.search({ query: 'document', from: 0, size: 3 })
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__first-page.disabled').length).toEqual(2)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__previous-page.disabled').length).toEqual(2)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__next-page.disabled').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__last-page.disabled').length).toEqual(0)
  })

  it('should display the next and the last page as unavailable', async () => {
    await letData(es).have(new IndexedDocuments().setBaseName('doc').withContent('this is a document').count(4)).commit()

    await wrapped.vm.search({ query: 'document', from: 3, size: 3 })
    await wrapped.vm.$nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__first-page.disabled').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__previous-page.disabled').length).toEqual(0)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__next-page.disabled').length).toEqual(2)
    expect(wrapped.vm.$el.querySelectorAll('.search-results__header__last-page.disabled').length).toEqual(2)
    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress__pagination').textContent)).toEqual('4 - 4')
    expect(trim(wrapped.vm.$el.querySelector('.search-results__header__progress_number-of-results').textContent)).toEqual('on 4 documents found')
    expect(wrapped.vm.$el.querySelectorAll('.search-results-item').length).toEqual(1)
  })
})
