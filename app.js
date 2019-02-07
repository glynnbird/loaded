Vue.use(VueMaterial.default)
var CLOUDANT_URL = 'https://d360fd11-57ef-46cd-af46-496f14ace2bb-bluemix.cloudant.com/'

var unpartitionedQueue = async.queue(function(work, done) {
  // global find
  var url =  CLOUDANT_URL + work.db + '/_find'

  // Cloudant Query
  var q = {
    selector: {
      userid: work.userid
    },
    fields: ['saleDate', 'currency', 'total'],
    limit:10,
    use_index: 'by-userid-index'
  }
  var r = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(q)
  }
  app.queries++
  //console.log(app.queries)
  fetch(url, r).then((response) => {
    return response.json()
  }).then((data) => {
    //console.log(data)
    app.successes++
    done()
  }).catch((err) => {
    //console.error(err)
    app.errors++
    done()
  })
},25)

var partitionedQueue = async.queue(function(work, done) {
  // global find
  var url =  CLOUDANT_URL + work.db + '/_partition/' + work.userid + '/_all_docs?limit=10'
  app.queries++
  //console.log(app.queries)
  fetch(url).then((response) => {
    return response.json()
  }).then((data) => {
    //console.log(data)
    app.successes++
    done()
  }).catch((err) => {
    //console.error(err)
    app.errors++
    done()
  })
},25)

var ms = function() {
  var d = new Date()
  return d.getTime() / 1000
}

var app = new Vue({
  el: '#app',
  data: {
    title: 'Cloudant Load Test',
    testUnderway: false,
    queries: 0,
    startTime: 0,
    errors: 0,
    successes: 0
  },
  computed: {
    qps: function() {
      return (this.successes / (ms() - this.startTime)).toFixed(1)
    }
  },
  methods: {
    testTimer: function () {
      setTimeout(() => {
        console.log('ending test')
        app.testUnderway = false
        // remove unprocessed items from the queue
        unpartitionedQueue.remove(function() { return true })
        partitionedQueue.remove(function() { return true })
        console.log('ended test')
      }, 10000)
    },
    startStandardLoadTest: function() {
      console.log('standard load test')
      this.testUnderway = true
      this.testTimer()
      this.startTime = ms()
      this.queries = 0
      this.errors = 0
      this.successes = 0
      for(var i = 0; i < 5000; i++) {
        var work = { db: 'orders', userid: 'user' + Math.floor(Math.random()*1000) }
        unpartitionedQueue.push(work)
      }
    },
    startPartitionedLoadTest: function() {
      console.log('partitioned load test')
      this.testUnderway = true
      this.testTimer()
      this.startTime = ms()
      this.queries = 0
      this.errors = 0
      this.successes = 0
      for(var i = 0; i < 5000; i++) {
        var work = { db: 'orders', userid: 'user' + Math.floor(Math.random()*1000) }
        partitionedQueue.push(work)
      }

    }
  }
})