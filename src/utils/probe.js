import ReconnectingWebSocket from "@/utils/ReconnectingWebSocket"
import config from "@/config";
import qs from 'qs'
import pe from '@/models/probe/probeevents'
import environment from "@/utils/environment"
import Console from "@/utils/Console"
import store from '@/store'
import i18n from "@/i18n";

function randomString (length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

function properlySupportedWebSocket() {
  if (!('ArrayBuffer' in window)) return false

  try {
    if (!('WebSocket' in window && window.WebSocket.CLOSING === 2)) return false
  } catch (e) {return false}

  const protocol = 'https:' === window.location.protocol ? 'wss' : 'ws'
  let protoBin

  protoBin = 'binaryType' in WebSocket.prototype
  if (protoBin) return protoBin
  try {
    return !!(new WebSocket(protocol + '://.').binaryType);
    // eslint-disable-next-line no-empty
  } catch (e) {}

  return false
}

class FakeTransport {
  send() {}
}

class PenguinProbe {
  constructor () {
    console.log(store)
    let probeUid = store.getters['auth/probeUid']
    if (!probeUid.c || (Date.now - probeUid.u) > config.probe.uidExpiration) {
      const gen = randomString(32)
      store.commit('auth/changeProbeUid', gen)
      probeUid = store.getters['auth/probeUid']
    }

    const platform = environment.platform

    const queries = qs.stringify({
      v: config.version,
      p: platform,
      u: probeUid.c,
      r: window.location.pathname
    })

    this.initiate(queries)
  }

  initiate(queries) {
    const endpoint = environment.adapter(config.probe.endpoint)

    if (!properlySupportedWebSocket()) {
      new Image().src = `${endpoint.legacy}?` + queries + `&l=1`
      this.transport = new FakeTransport()
      return
    }

    this.transport = ReconnectingWebSocket(
      `${endpoint.ws}?` + queries,
      [],
      {
        backoffInitial: 500,
        backoffMax: 5
      },
      {
        onopen (e) {
          Console.debug('ProbeTransport', 'websocket connection opened as', e)
        },
        onclose (e) {
          Console.debug('ProbeTransport', 'websocket connection closed as', e)
        },
        onmessage (e) {
          Console.debug('ProbeTransport', 'websocket received message as', e)
          try {
            if (e && e.data && e.data.arrayBuffer) {
              const buffer = e.data.arrayBuffer()
              buffer.then((data) => {
                const decoded = pe.PenguinProbe.ServerACK.decodeDelimited(data)
                Console.debug('ProbeTransport', 'server ack: received messageType', decoded.type, 'with extra message', decoded.message || '(none)')
              })
            }
          } catch (e) {
            Console.warn('ProbeTransport', 'server ack: error occurred when trying to decode')
          }
        },
        onerror (e) {
          Console.warn('ProbeTransport', 'websocket connection errored as', e)
        }
      }
    )
  }

  reflectLanguage (language) {
    switch (language) {
      case 'en':
        return pe.PenguinProbe.Language.EN_US
      case 'zh':
        return pe.PenguinProbe.Language.ZH_CN
      case 'ja':
        return pe.PenguinProbe.Language.JA_JP
      case 'ko':
        return pe.PenguinProbe.Language.KO_KR
      default:
        return pe.PenguinProbe.Language.OTHER
    }
  }

  buildMeta (messageType) {
    const i18nLanguage = i18n.locale

    return pe.PenguinProbe.Meta.create({
      type: messageType,
      language: this.reflectLanguage(i18nLanguage)
    })
  }

  reportNavigated (path) {
    const message = pe.PenguinProbe.Navigated.create({
      meta: this.buildMeta(pe.PenguinProbe.MessageType.NAVIGATED),
      path
    })
    this.transport.send(pe.PenguinProbe.Navigated.encode(message).finish())
  }

  reportEnteredSearchResult ({stageId, itemId, query, position}) {
    const message = pe.PenguinProbe.EnteredSearchResult.create({
      meta: this.buildMeta(pe.PenguinProbe.MessageType.ENTERED_SEARCH_RESULT),
      stageId,
      itemId,
      query,
      position
    })
    this.transport.send(pe.PenguinProbe.EnteredSearchResult.encode(message).finish())
  }

  reportExecutedAdvancedQuery ({queries}) {
    const marshalledQueries = []
    for (const query of queries) {
      marshalledQueries.push(pe.PenguinProbe.ExecutedAdvancedQuery.AdvancedQuery.create(query))
    }
    const message = pe.PenguinProbe.ExecutedAdvancedQuery.create({
      meta: this.buildMeta(pe.PenguinProbe.MessageType.EXECUTED_ADVANCED_QUERY),
      queries: marshalledQueries
    })
    this.transport.send(pe.PenguinProbe.ExecutedAdvancedQuery.encode(message).finish())
  }
}

const probe = new PenguinProbe()

export default probe