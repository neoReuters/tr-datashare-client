import { shallowMount } from '@vue/test-utils'

import { flushPromises } from '~tests/unit/tests_utils'
import esConnectionHelper from '~tests/unit/specs/utils/esConnectionHelper'
import CoreSetup from '~tests/unit/CoreSetup'
import * as widgets from '@/store/widgets'
import WidgetFieldFacets from '@/components/widget/WidgetFieldFacets'

const { index: project, es: elasticsearch } = esConnectionHelper.build()

describe('WidgetFieldFacets.vue', () => {
  let wrapper

  beforeAll(() => {
    // Mock all elasticsearch search calls using a mock
    elasticsearch.search = vi.fn().mockImplementation(() => {
      return Promise.resolve({
        aggregations: {
          facets: {
            buckets: [
              { key: 'foo', doc_count: 10 },
              { key: 'bar', doc_count: 20 }
            ]
          }
        },
        hits: {
          total: { value: 30 }
        }
      })
    })
  })

  beforeEach(async () => {
    const { plugins, store } = CoreSetup.init({ elasticsearch }).useAll().useRouter()
    store.commit('insights/project', project)

    wrapper = shallowMount(WidgetFieldFacets, {
      global: {
        plugins
      },
      props: {
        widget: new widgets.WidgetFieldFacets({
          title: 'Test Widget',
          card: true,
          field: 'contentType',
          routeQueryField: 'contentType'
        })
      }
    })
    // Wait for the loading of the first page
    await flushPromises()
  })

  it('renders the component', () => {
    expect(wrapper.exists()).toBeTruthy()
  })

  it('has the correct class', () => {
    expect(wrapper.classes()).toContain('widget--field-facets')
  })

  it('renders the title with card-header class when card is true', () => {
    const titleElement = wrapper.find('.widget__header')
    expect(titleElement.exists()).toBeTruthy()
    expect(titleElement.classes()).toContain('card-body')
    expect(titleElement.text()).toBe('Test Widget')
  })

  it('renders the title without card-header class when card is false', async () => {
    await wrapper.setProps({
      widget: new widgets.WidgetFieldFacets({
        title: 'Test Widget',
        card: false,
        field: 'testField',
        routeQueryField: 'contentType'
      })
    })

    const titleElement = wrapper.find('.widget__header')
    expect(titleElement.exists()).toBeTruthy()
    expect(titleElement.classes()).not.toContain('card-header')
    expect(titleElement.text()).toBe('Test Widget')
  })

  it('loads a page of data', () => {
    expect(wrapper.vm.total).toBe(30)
    expect(wrapper.vm.items[0]).toEqual({ label: 'foo', count: 10, href: expect.stringContaining('contentType=foo') })
    expect(wrapper.vm.items[1]).toEqual({ label: 'bar', count: 20, href: expect.stringContaining('contentType=bar') })
  })
})
