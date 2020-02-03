const request = require('request')
const fs = require('fs')

const min = 1
const max = 100000

const doWork = async () => {
  for (let i = min; i <= max; i++) {
    if (i % 100 === 0) {
      console.log(i)
      await sleep(10)
    }
    request(process.env.TRACK_URL + i)
      .pipe(fs.createWriteStream(`./tracks/${i}.gpx`))
  }
}

const sleep = sec => new Promise((resolve) => {
  setTimeout(resolve, sec * 1000)
})

doWork()
