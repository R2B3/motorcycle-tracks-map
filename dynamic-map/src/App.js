import React, { useState, useEffect, useRef } from 'react'
import './App.css';
import ReactMapGL, { Source, Layer } from 'react-map-gl'
import { trackLayer, roadLayer, noResultLayer } from './map-style.js'
import geoViewport from '@mapbox/geo-viewport'
import debounce from 'lodash/debounce'
import isNil from 'lodash/isNil'
import cloneDeep from 'lodash/cloneDeep'
const minUse = 12

const App = () => {
  const [tracks, setTracks] = useState(null)
  const [roads, setRoads] = useState(null)
  const [noResultPoints, setNoResultPoints] = useState(null)
  const [showPoints, setShowPoints] = useState(false)
  const [showAllRoads, setShowAllRoads] = useState(false)
  const [viewport, setViewport] = useState({
    width: '100vw',
    height: '100vh',
    latitude: 51.133481,
    longitude: 10.018343,
    zoom: 5
  })

  useEffect(() => {
    let didCancel = false
    const fetchData = async () => {
        try {
          const result = await (await fetch(`/tracks/geojson?minUse=${minUse}`)).json()
          if (!didCancel) {
            setTracks(result)
          }
        } catch (err) {
            console.log(err)
        }
    }
    fetchData()
    return () => {
        didCancel = true
      }
  }, [])


  const loadRoads = debounce(async viewport => {
    const { latitude, longitude, zoom, width, height } = viewport
    const bounds = geoViewport.bounds([longitude, latitude], zoom, [ width, height ])
    try {
      const result = await (await fetch(`/roads/geojson?lonMin=${bounds[0]}&lonMax=${bounds[2]}&latMin=${bounds[1]}&latMax=${bounds[3]}`)).json()
        setRoads(result)
    } catch (err) {
        console.log(err)
    }
  }, 1000)

  const loadPoints = debounce(async viewport => {
    const { latitude, longitude, zoom, width, height } = viewport
    const bounds = geoViewport.bounds([longitude, latitude], zoom, [ width, height ])
    try {
      const result = await (await fetch(`/no-result-points/geojson?lonMin=${bounds[0]}&lonMax=${bounds[2]}&latMin=${bounds[1]}&latMax=${bounds[3]}`)).json()
      console.log(result)
      setNoResultPoints(result)
    } catch (err) {
        console.log(err)
    }
  }, 1000)

  const viewPortChange = newViewport => {
    if (isNil(newViewport)) return

    const oldViewport = cloneDeep(viewport)
    setViewport(newViewport)

    if (isNil(oldViewport)) return
    if (newViewport.zoom < 12) return
    if (getZoomInOnly(newViewport, oldViewport) === true) return

    if (showPoints) loadPoints(viewport)
    if (showAllRoads) loadRoads(viewport)
  }

  const getZoomInOnly = (viewport, oldViewport) => {
    if (oldViewport === null) return true

    const bounds = geoViewport.bounds([viewport.longitude, viewport.latitude], viewport.zoom, [ viewport.width, viewport.height ])
    const oldBounds = geoViewport.bounds([oldViewport.longitude, oldViewport.latitude], oldViewport.zoom, [ oldViewport.width, oldViewport.height ])
    return bounds[0] > oldBounds[0] && bounds[1] > oldBounds[1] && bounds[2] < oldBounds[2] && bounds[3] < oldBounds[3]

    // Bounds looks like this:
    // [
    //   -40.15797827531491,
    //   37.23955182893108,
    //   55.07925543733728,
    //   60.51133317498441
    // ]
  }

  return (
    <ReactMapGL
      {...viewport}
      mapStyle='mapbox://styles/mapbox/dark-v10'
      mapboxApiAccessToken={process.env.REACT_APP_MAPBOXAPIKEY}
      onViewportChange={viewPortChange}
    >
      <Source type="geojson" data={tracks}>
        <Layer {...trackLayer} />
      </Source>
      <Source type="geojson" data={roads}>
        <Layer {...roadLayer} />
      </Source>
      <Source type="geojson" data={noResultPoints}>
        <Layer {...noResultLayer} />
      </Source>
    </ReactMapGL>
  )
}

export default App;
