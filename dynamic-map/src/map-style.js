export const trackLayer = {
    id: 'trackLayer',
    type: 'line',
    paint: {
      'line-color': {
        property: 'useCount',
        stops: [
          [1, '#3288bd'],
          [100, '#66c2a5'],
          [200, '#abdda4'],
          [500, '#e6f598'],
          [1000, '#ffffbf'],
          [2000, '#fee08b'],
          [5000, '#fdae61'],
          [10000, '#f46d43'],
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