const deepstream = require('deepstream.io-client-js')
const needle = require('needle')

const records = new Map()

const client = deepstream('')
client.login({}, (success) => {
  if (!success) throw new Error('Unable to connect to deepstreamHub')
  setInterval(fetchFlightData, 1000)
})

client.on('error', console.log)


/**
 *0  icao24  string  Unique ICAO 24-bit address of the transponder in hex string representation.
  1 callsign  string  Callsign of the vehicle (8 chars). Can be null if no callsign has been received.
  2 origin_country  string  Country name inferred from the ICAO 24-bit address.
  3 time_position float Unix timestamp (seconds) for the last position update. Can be null if no position report was received by OpenSky within the past 15s.
  4 time_velocity float Unix timestamp (seconds) for the last velocity update. Can be null if no velocity report was received by OpenSky within the past 15s.
  5 longitude float WGS-84 longitude in decimal degrees. Can be null.
  6 latitude  float WGS-84 latitude in decimal degrees. Can be null.
  7 altitude  float Barometric or geometric altitude in meters. Can be null.
  8 on_ground boolean Boolean value which indicates if the position was retrieved from a surface position report.
  9 velocity  float Velocity over ground in m/s. Can be null.
  10  heading float Heading in decimal degrees clockwise from north (i.e. north=0°). Can be null.
  11  vertical_rate float Vertical rate in m/s. A positive value indicates that the airplane is climbing, a negative value indicates that it descends. Can be null.
  12  sensors int[] IDs of the receivers which contributed to this state vector. Is null if no filtering for sensor was used in the request.
 */
const fetchFlightData = () => {
  needle.get('https://opensky-network.org/api/states/all', (err, resp) => {
    const { time, states } = resp.body
    states.forEach((state) => {
      if (!state[1] || !state[5] || !state[6]) return
      updateLocation(state)
    })
  })
}

const updateLocation = (state) => {
  console.log('Updating to', state[5], state[6])
  let record = records.get(state[1])
  process.nextTick(() => {
    if (!record) {
      record = client.record.getRecord(`flights/${state[1]}`)
      records.set(`flights/${state[1]}`, record)
    }

    record.set('lat', state[6])
    record.set('lng', state[5])
  })
}
