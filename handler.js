'use strict';
const rp = require('request-promise-native');
const { request } = require('graphql-request');
const isIp = require('is-ip');
const ipApi = 'https://api.graphloc.com/graphql';
const googleApi = 'https://maps.googleapis.com/maps/api/directions/json';
const key = process.env.API_KEY;

const geoQuery = (from, to) => {
  return `
  {
    fromResp: getLocation(ip: "${from}") {
      location {
        latitude
        longitude
      }
    },
    toResp: getLocation(ip: "${to}") {
      location {
        latitude
        longitude
      }
    }
  }
`
}

const sendResponse = (callback, data, status) => {
  const response = {
    statusCode: status || 200,
    body: JSON.stringify(data),
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true // Required for cookies, authorization headers with HTTPS
    }
  };
  callback(null, response);
}

module.exports.directions = (event, context, callback) => {
  // confirm we got the correct event data, if not fail.
  if (event && event.pathParameters && event.pathParameters.to && event.pathParameters.from) {
    const {from, to} = event.pathParameters;
    // confirm we have valid ips, if not fail
    if(isIp(from) && isIp(to)) {
      request(ipApi, geoQuery(from, to))
        .then((data) => {
          const {
            fromResp,
            toResp
          } = data;
          const fromLatLon = `${fromResp.location.latitude},${fromResp.location.longitude}`;
          const toLatLon = `${toResp.location.latitude},${toResp.location.longitude}`;
          const url = `${googleApi}?origin=${fromLatLon}&destination=${toLatLon}&key=${key}`;
          const options = {
            uri: url,
            json: true
          };
          rp(options)
            .then((directions) => {
              if (directions && directions.routes) {
                sendResponse(callback, directions.routes);
              }
            })
            .catch((err) => console.log(err));
        })
        .catch((err) => console.log(err));
    } else {
      sendResponse(callback, 'Invalid IP address provided.', 400);
    }
  } else {
    sendResponse(callback, 'Must provide a from and to IP address.', 400);
  }
};
