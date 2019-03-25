import compact from 'lodash/compact'
import first from 'lodash/first'
import last from 'lodash/last'
import pick from 'lodash/pick'
import trim from 'lodash/trim'
import truncate from 'lodash/truncate'
import Murmur from '@icij/murmur'

import DatashareClient from './DatashareClient'
import EsDoc from './EsDoc'
import moment from 'moment'

export default class Document extends EsDoc {
  get shortId () {
    return this.id.slice(0, 10)
  }
  get path () {
    return this.get('_source.path', '')
  }
  get folder () {
    // Extract location parts
    let parts = this.path.split('/')
    // Remove the file name
    parts.splice(-1, 1)
    // And return the new path
    return parts.join('/') + '/'
  }
  get location () {
    return this.folder.split(Murmur.config.get('dataDir', process.env.VUE_APP_DATA_PREFIX)).pop()
  }
  get basename () {
    return last(this.path.split('/'))
  }
  get title () {
    return first(compact([
      trim(this.get('_source.metadata.tika_metadata_subject', '')),
      trim(this.get('_source.metadata.tika_metadata_dc_title', '')),
      this.basename,
      this.shortId
    ]))
  }
  get slicedName () {
    if (this.get('_source.extractionLevel', 0) === 0) {
      return [ this.title ]
    }
    const distance = this.get('_source.extractionLevel') - 1
    // Sliced name for extracted doc is composed of:
    // - root title (if available)
    // - distance with the top parent
    // - shorter version of the document id
    const root = this.parent ? truncate(this.parent.title, { length: 30 }) : this.basename
    return [ root ].concat([ distance ].slice(0, distance)).concat([ this.shortId ])
  }
  get highlight () {
    return this.raw.highlight
  }
  get url () {
    return '/api/index/src/' + this.index + '/' + this.id + '?routing=' + this.routing
  }
  get fullUrl () {
    return DatashareClient.getFullUrl(this.url)
  }
  get contentType () {
    return this.source.contentType || 'unknown'
  }
  get creationDate () {
    return moment(this.source.metadata.tika_metadata_creation_date).format('LLL')
  }
  get humanSize () {
    if (this.source.contentLength === -1) return 'unknown'
    let size = this.source.contentLength
    let unitIndex = Math.floor(size === 0 ? 0 : Math.log(size) / Math.log(1024))
    let value = (size / Math.pow(1024, unitIndex)).toFixed(2)
    let unit = ['B', 'kB', 'MB', 'GB', 'TB'][unitIndex]
    return unitIndex === 0 ? `${size} B` : `${value} ${unit} (${size} B)`
  }
  get index () {
    return this.raw._index
  }
  get routerParams () {
    return pick(this, ['index', 'id', 'routing'])
  }
  get serializedForStorage () {
    return pick(this.raw, [
      '_id',
      '_routing',
      '_version',
      '_index',
      '_source.path',
      '_source.extractionLevel',
      '_source.contentLength',
      '_source.contentType',
      '_source.metadata.tika_metadata_subject',
      '_source.metadata.tika_metadata_dc_title'
    ])
  }
  get threadIndex () {
    return this.get('_source.metadata.tika_metadata_message_raw_header_thread_index', null)
  }
  get messageId () {
    return this.get('_source.metadata.tika_metadata_message_raw_header_message_id', null)
  }
  get messageFrom () {
    return this.get('_source.metadata.tika_metadata_message_from', null)
  }
  get messageTo () {
    return this.get('_source.metadata.tika_metadata_message_to', null)
  }
  get excerpt () {
    return truncate(trim(this.source.content), { length: 280 })
  }
  get createdAt () {
    return this.get('_source.metadata.tika_metadata_meta_creation_date', null)
  }
  get isEmail () {
    return this.contentType.indexOf('message/') === 0
  }
  get isPdf () {
    return this.contentType === 'application/pdf'
  }
  get isTiff () {
    return this.contentType === 'image/tiff'
  }
  get isSpreadsheet () {
    return ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'].indexOf(this.contentType) > -1
  }
  get isImage () {
    return this.contentType.indexOf('image/') === 0
  }
  static get esName () {
    return 'Document'
  }
  static create (raw) {
    return new Document(raw)
  }
}
