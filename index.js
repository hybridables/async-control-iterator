/*!
 * async-base-iterator <https://github.com/tunnckoCore/async-base-iterator>
 *
 * Copyright (c) 2016 Charlike Mike Reagent <@tunnckoCore> (http://www.tunnckocore.tk)
 * Released under the MIT license.
 */

'use strict'

var utils = require('./utils')
var AppBase = require('async-simple-iterator').AsyncSimpleIterator

/**
 * > Initialize `AsyncBaseIterator` with `options`, see also [async-simple-iterator][].
 *
 * **Example**
 *
 * ```js
 * var ctrl = require('async')
 * var AsyncBaseIterator = require('async-base-iterator').AsyncBaseIterator
 *
 * var fs = require('fs')
 * var base = new AsyncBaseIterator({
 *   settle: true,
 *   beforeEach: function (fn) {
 *     console.log('before each:', fn.name)
 *   },
 *   error: function (err, res, fn) {
 *     console.log('on error:', fn.name)
 *   }
 * })
 * var iterator = base.makeIterator({
 *   afterEach: function (err, res, fn) {
 *     console.log('after each:', err, res, fn.name)
 *   }
 * })
 *
 * ctrl.mapSeries([
 *   function one () { return 1 },
 *   function two (done) { done(null, 2) },
 *   function three () { return 3 },
 * ], iterator, function (err, results) {
 *   // => `err` will always be null, if `settle:true`
 *   // => `results` is [1, 2, 3]
 * })
 * ```
 *
 * @param {Object=} `options` Pass `beforeEach`, `afterEach` and `error` hooks or `settle` option.
 * @api public
 */

function AsyncBaseIterator (options) {
  if (!(this instanceof AsyncBaseIterator)) {
    return new AsyncBaseIterator(options)
  }
  AppBase.call(this, options)
  this.defaultOptions({context: {}})
}

AppBase.extend(AsyncBaseIterator)

/**
 * > Make iterator to be passed to [async][] lib.
 *
 * **Example**
 *
 * ```js
 * var ctrl = require('async')
 * var base = require('async-simple-iterator')
 *
 * base
 *   .on('afterEach', function (err, res, fn) {
 *     console.log('after each:', err, res, fn.name)
 *   })
 *   .on('error', function (err, res, fn) {
 *     console.log('on error:', err, res, fn.name)
 *   })
 *
 * var iterator = base.makeIterator({
 *   settle: true,
 *   beforeEach: function (fn) {
 *     console.log('before each:', fn.name)
 *   }
 * })
 *
 * function throwError () {
 *   throw new Error('two err')
 * }
 *
 * ctrl.mapSeries([
 *   function one () { return 1 },
 *   function two () {
 *     throwError()
 *     return 2
 *   },
 *   function three (cb) { cb(null, 3) }
 * ], iterator, function (err, res) {
 *   // `err` is always `null` when `settle: true`
 *   console.log(err) // => null
 *   console.log(res) // => [1, [Error: two err], 3]
 * })
 * ```
 *
 * @emit  `beforeEach` with signature `fn, next`
 * @emit  `afterEach` with signature `err, res, fn, next`
 * @emit  `error` with signature `err, res, fn, next`
 *
 * @name   .makeIterator
 * @param  {Object=} `[options]` Pass `beforeEach`, `afterEach` and `error` hooks or `settle` option.
 * @return {Function} Iterator that can be passed to any [async][] method.
 * @api public
 */

AppBase.define(AsyncBaseIterator.prototype, 'makeIterator', function makeIterator (options) {
  return this.wrapIterator(function (fn, next) {
    var context = this.options.context
    var params = (utils.isArray(this.options.params) && this.options.params || []).concat(next)
    var func = typeof this.options.letta === 'function' ? this.options.letta : utils.relike

    function isFunction (res) {
      if (typeof res === 'function') {
        return func.apply(context, [res].concat(params)).then(isFunction)
      }
      return res
    }

    utils
      .then(func.apply(
        context,
        [fn].concat(params)
      ).then(isFunction))
      .then(next)
  }, options)
})

/**
 * > Helper, wrapper function. Use it to wrap you final
 * callback function which you pass to [async][] lib.
 * This may be needed if you want to catch if error happens in
 * the final callback function, because actually it is
 * executed in promise as the other functions in stack.
 * There's just no other way to handle errors from final callback,
 * it is rare case, but sometimes it may be needed. Be aware of that.
 *
 * **Example**
 *
 * ```js
 * var base = require('async-base-iterator')
 * var ctrl = require('async')
 * var assert = require('assert')
 *
 * ctrl.mapSeries([function () {
 *   return 123
 * }], base.makeIterator(), base.doneCallback(function (err, res) {
 *   console.log(err) // => null
 *   console.log(res) // => 123
 *   assert.strictEqual(res, 555) // intentionally
 * }, function (err) {
 *   console.log(err) // => AssertionError
 * }))
 * ```
 *
 * @name   .doneCallback
 * @param  {Function} `<fn>` called with arguments passed to the returned callback
 * @param  {Function=} `[done]` optional
 * @return {Function} callback function that you can pass to [async][] methods
 * @api public
 */

AppBase.define(AsyncBaseIterator.prototype, 'doneCallback', function doneCallback (fn, done) {
  var self = this
  return function () {
    try {
      fn.apply(self, arguments)
    } catch (err) {
      return done.call(self, err)
    }
    done.call(self)
  }
})

/**
 * Expose `AsyncBaseIterator` instance
 *
 * @type {Object}
 * @api private
 */

module.exports = new AsyncBaseIterator()

/**
 * Expose `AsyncBaseIterator` constructor
 *
 * @type {Function}
 * @api private
 */

module.exports.AsyncBaseIterator = AsyncBaseIterator
