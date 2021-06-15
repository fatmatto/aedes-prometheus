'use strict'

const client = require('prom-client')
const { collectDefaultMetrics, Counter, Registry, Gauge } = client

const events = [
  'client',
  'clientReady',
  'clientDisconnect',
  'clientError',
  'connectionError',
  'keepaliveTimeout',
  'publish',
  'ack',
  'ping',
  'subscribe',
  'unsubscribe',
  'connackSent',
  'closed'
]

const eventsCounters = {}
const additionalMetrics = {}

events.forEach(eventName => {
  const counter = new Counter({
    name: `aedes_event_${eventName}`,
    help: `Increased whenever a "${eventName}" event is emitted by aedes.`
  })

  eventsCounters[eventName] = counter
})

additionalMetrics.publishedBytesCounter = new Counter({
  name: 'aedes_published_packets_size',
  help: 'Whenever a client publishes a packet, this counter is increased by the packet\'s payload size in bytes.'
})

additionalMetrics.connectedClientsGauge = new Gauge({
  name: 'aedes_connected_clients',
  help: 'Increased on each connection. Decreased on each disconnection'
})
additionalMetrics.connectedClientsGauge.set(0)

const register = new Registry()
collectDefaultMetrics({ register })
for (const eventName in eventsCounters) {
  register.registerMetric(eventsCounters[eventName])
}

function collect (aedes) {
  aedes.on('clientReady', (packet) => {
    additionalMetrics.connectedClientsGauge.inc(1)
  })
  aedes.on('clientDisconnected', (packet) => {
    additionalMetrics.connectedClientsGauge.dec(1)
  })

  aedes.on('publish', (packet) => {
    const buf = Buffer.from(packet.payload)
    const bytes = Buffer.byteLength(buf)
    additionalMetrics.publishedBytesCounter.inc(bytes)
  })
  events.forEach(eventName => {
    const counter = eventsCounters[eventName]
    aedes.on(eventName, () => {
      counter.inc()
    })
  })
}

module.exports = {
  collect
}
