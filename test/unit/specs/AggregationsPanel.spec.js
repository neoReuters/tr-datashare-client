import Vue from 'vue'
import VueI18n from 'vue-i18n'
import noop from 'lodash/noop'
import trim from 'lodash/trim'
import 'es6-promise/auto'
import {mount, createLocalVue} from 'vue-test-utils'
import elasticsearch from 'elasticsearch-browser'
import esMapping from '@/datashare_index_mappings.json'
import messages from '@/messages'
import router from '@/router'

import FontAwesomeIcon from '@/components/FontAwesomeIcon'
import AggregationsPanel from '@/components/AggregationsPanel'
import {IndexedDocument, letData} from '../es_utils'

Vue.use(VueI18n)

const i18n = new VueI18n({locale: 'en', messages})
Vue.component('font-awesome-icon', FontAwesomeIcon)

describe('AggregationsPanel.vue', () => {
  var es = new elasticsearch.Client({host: process.env.CONFIG.es_host})
  var wrapped = null
  before(async () => {
    await es.indices.create({index: process.env.CONFIG.es_index})
    await es.indices.putMapping({index: process.env.CONFIG.es_index, type: 'doc', body: esMapping})
  })
  after(async () => {
    await es.indices.delete({index: process.env.CONFIG.es_index})
  })
  beforeEach(async () => {
    await es.deleteByQuery({index: process.env.CONFIG.es_index, conflicts: 'proceed', body: {query: {match_all: {}}}})
    const localVue = createLocalVue()
    localVue.use(VueI18n)
    AggregationsPanel.created = noop
    wrapped = mount(AggregationsPanel, {i18n, router})
  })

  it('NER aggregation: should display empty list', async () => {
    await wrapped.vm.aggregate()
    await Vue.nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.aggregations-panel__mentions__item').length).to.equal(0)
  })

  it('NER aggregation: should display one named entity', async () => {
    await letData(es).have(new IndexedDocument('docs/naz.txt').withContent('this is a naz document').withNer('naz')).commit()
    await wrapped.vm.aggregate()
    await Vue.nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.aggregations-panel__mentions__item').length).to.equal(1)
    expect(trim(wrapped.vm.$el.querySelector('.aggregations-panel__mentions__item__description').textContent)).to.equal('one occurrence in one document')
  })

  it('NER aggregation: should display two named entities in one document', async () => {
    await letData(es).have(new IndexedDocument('docs/qux.txt').withContent('this is a document')
      .withNer('qux').withNer('foo')).commit()
    await wrapped.vm.aggregate()
    await Vue.nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.aggregations-panel__mentions__item').length).to.equal(2)
  })

  it('NER aggregation: should display one named entity in two documents', async () => {
    await letData(es).have(new IndexedDocument('docs/doc1.txt').withContent('a NER document contain 2 NER').withNer('NER', 2).withNer('NER', 25)).commit()
    await letData(es).have(new IndexedDocument('docs/doc2.txt').withContent('another document with NER').withNer('NER', 22)).commit()

    await wrapped.vm.aggregate()
    await Vue.nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.aggregations-panel__mentions__item').length).to.equal(1)
    expect(trim(wrapped.vm.$el.querySelector('.aggregations-panel__mentions__item__description').textContent)).to.equal('3 occurrences in 2 documents')
  })

  it('NER aggregation: should display two named entities in two documents', async () => {
    await letData(es).have(new IndexedDocument('docs/doc1.txt').withContent('a NER1 document').withNer('NER1', 2)).commit()
    await letData(es).have(new IndexedDocument('docs/doc2.txt').withContent('a NER2 doc with NER2 NER2 NER1')
      .withNer('NER2', 2).withNer('NER2', 16).withNer('NER2', 21).withNer('NER1', 26)).commit()

    await wrapped.vm.aggregate()
    await Vue.nextTick()

    expect(wrapped.vm.$el.querySelectorAll('.aggregations-panel__mentions__item').length).to.equal(2)
    expect(wrapped.vm.$el.querySelector('.aggregations-panel__mentions__item__key').textContent.trim()).to.equal('NER1')
  })
})
