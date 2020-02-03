export const trackLayer = {
    id: 'trackLayer',
    type: 'line',
    paint: {
      'line-color': {
        property: 'useCount',
        stops: [
          [12, '#3288bd'],
          [15, '#66c2a5'],
          [20, '#abdda4'],
          [30, '#e6f598'],
          [50, '#ffffbf'],
          [75, '#fee08b'],
          [100, '#fdae61'],
          [200, '#f46d43'],
        ]
      },
      'line-opacity': 1,
      'line-width': 3
    }
  }

export const roadLayer = {
  id: 'roadLayer',
  type: 'line',
  paint: {
    'line-color': '#FFF'
    },
    'line-opacity': 1,
    'line-width': 3
  }

export const noResultLayer = {
  id: 'noResultLayer',
  type: 'circle',
  paint: {
    'circle-fill': '#f46d43'
  }
}