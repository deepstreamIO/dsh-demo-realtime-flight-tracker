const deepstream = require('deepstream.io-client-js')
const needle = require('needle')

let flightList
const flights = new Map()

const client = deepstream('<Your app URL>')
client.login({}, (success) => {
  flightList = client.record.getList('flights')
  flightList.setEntries([])
  setInterval(fetchFlightData, 1000)
  fetchFlightData()
  setTimeout(() => setInterval(updateLocations, 500), 5000)
})

const fetchFlightData = () => {
  // flights around Berlin
  needle.get('https://data-live.flightradar24.com/zones/fcgi/feed.js?bounds=52.74,52.19,12.91,13.74', (err, resp) => {
    if (err) throw err
    for (const key in resp.body) {
      if (!(resp.body[key] instanceof Array)) continue
      const [flightId, lat, lng] = resp.body[key]
      addToBuffer(flightId, lat, lng)
    }
  })
}

const addToBuffer = (flightId, lat, lng) => {
  const flightName = `flights/${flightId}`
  let flight = flights.get(flightName)
  if (!flight) {
    flight = {}
    flight.record = client.record.getRecord(flightName)
    if (flightList.getEntries().indexOf(flightName) === -1) {
      flightList.addEntry(flightName)
    }
    flight.buffer = [{ lat, lng }]
    flight.lastLocation = { lat, lng }
    flights.set(flightName, flight)
  }
  if (flight.lastLocation.lat == lat && flight.lastLocation.lng == lng ) {
    return
  } else {
    for (let i = 0; i < 50; i++) {
      const newLat = lat - ((flight.lastLocation.lat - lat) / 50) * i
      const newLng = lng - ((flight.lastLocation.lng - lng) / 50) * i
      flight.buffer.push({ lat: newLat, lng: newLng })
    }
    flight.lastLocation = { lat, lng }
  }
}

const updateLocations = () => {
  for (const [flightName, flightData]  of flights) {
    if (!flightData.buffer[0]) continue
    flightData.record.set(
      flightData.buffer.shift()
    )
  }
}
