export const trackLayer = {
    id: 'trackLayer',
    type: 'line',
    paint: {
      'line-color': {
        property: 'useCount',
        stops: [
          [1, '#3288bd'],
          [5, '#66c2a5'],
          [10, '#abdda4'],
          [15, '#e6f598'],
          [25, '#ffffbf'],
          [50, '#fee08b'],
          [80, '#fdae61'],
          [100, '#f46d43'],
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