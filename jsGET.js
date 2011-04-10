/**
*
* jsGET
*
* jsGET is a http GET-Variables clone for javascript, using the hash part of the URL (index.html#...).
* You can set and get variables, and run a listener to hash changes, e.g. when the the history back button gets pressed.
* This allows you to create a usable history navigation in your ajax application. It should work with all A-grade browsers.
*
* @author Fabian Vogelsteller <fabian@feindura.org>
* @copyright Fabian Vogelsteller
* @license http://www.gnu.org/licenses GNU General Public License version 3
*
* @version 0.2
*
* ### Properties
* - vars:                     (object) the hash variables object loaded by get(), set(), remove(), or clear() or load() plus various indicators and trackers:
* - vars.current:             (object) the current variables.
* - vars.old:                 (object) the old variables, before they where changed with set(), remove(), clear() or the browser history back button.   *WARNING*: this is one is only valid while the listener is invoked.
* - vars.changed:             (object) the variables which have changed since the last call of get(), set(), remove(), clear(), load() or the browser history back button.   *WARNING*: this is one is updated by setChangedVars() depending on 'vars.old' and usually is only valid while the listener is invoked.
* - vars.change_count:        (integer) a number of variables changed/added/removed since the last time the listener was invoked.   *WARNING*: this is one is updated by setChangedVars() depending on 'vars.old' and usually is only valid while the listener is invoked.
* - vars.last_hash_loaded:    (string, internal use only) the raw hash string which was just processed; in the listener, this equals the current hash.
* - vars.last_hash_saved:     (string, internal use only) the hash section string which was the last one generated by set(), clear() or remove().
* - vars.foreign_hash_change: (boolean) TRUE when the hash was changed from outside our control, e.g. when the user hit the 'back/history' button in the browser, after the previous invocation of the listener.
* - vars.hash_changed:        (boolean) TRUE when the hash has changed after the previous invocation of the listener.
*
* ### Methods
* - load():                                 loads the current hash variables into the vars.current property as JSON object. Return the updated set of key/value pairs.
* - clear():                                clears the hash part of the URL. (because it's not completely possible, it sets it to "#_")
* - get(get):                               (string) try to get a hash variable with the given name.
* - set(set):                               (string,object) sets the given parameters to the hash variables. If it's a string it should have the following format: "key=value". Return the updated set of key/value pairs.
* - remove(remove):                         (string,array) the variable name(s) which should be removed from the hash variables. Return the old set of key/value pairs.
* - addListener(listener,callAlways,bind):  (listener: function, callAlways: boolean, bind: object instance) creates a listener which calls the given function when a hash change occurs. The called function will get the vars property (vars.current,vars.old,vars.changed) and use the "bind" parameter as "this", when specified.
*                                           The return of the addListener() method is a setInterval ID and must be passed to the removeListener() method to stop the listening.
*                                           When callAlways is FALSE, it only calls when the browser history buttons are pressed and not when get(), set(), remove() or clear() is called.
* - removeListener(listenerID):             (the setInterval Id received from a addListener() method) removes a listener set with the addListener() method.
* - setChangedVars():                       (internal use) updates the vars.changed collection and vars.change_count value.
*
* ### ATTENTION!
* Everytime you call set(), remove() or clear() a new hash string will be set,
* that means you also create a new history step in the browser history!
*
* These are 'special' characters to jsGET and will therefor be encoded when they are part of a key or value:
*   # & =
*/

var jsGET = {
	vars: {
		old: {},
		current: {},
		changed: {},
		change_count: 0,
		last_hash_loaded: '',
		last_hash_saved: window.location.hash,
		foreign_hash_change: false,
		hash_changed: false
	},
	load: function() {
		// only load hash variables when anything changed in the hash since last time we loaded them:
		var i;
		var new_hash = window.location.hash;

		if (this.vars.last_hash_loaded !== new_hash) {
			// detect whether the hash was changed outside our control, e.g. when user pushed BACK/HISTORY button in browser:
			if (new_hash !== this.vars.last_hash_saved) {
				this.vars.foreign_hash_change = true;
			}
			this.vars.hash_changed = true;

			var hashVars = new_hash.split('#');
			this.vars.current = {};
			if (typeof hashVars[1] !== 'undefined' && hashVars[1] && hashVars[1] !== '_') {
				hashVars = hashVars[1].split('&');
				for(i = 0; i < hashVars.length; i++) {
					var hashVar = hashVars[i].split('=');
					this.vars.current[this.decode(hashVar[0])] = (typeof hashVar[1] !== 'undefined' ? this.decode(hashVar[1]) : '');
				}
			}
			this.vars.last_hash_loaded = new_hash;
		}
		return this.vars.current;
	},
	// encode special characters in the input string; use encodeURIComponent() to encode as that one is fast and ensures proper Unicode handling as well: bonus!
	encode: function(s) {
		s = encodeURIComponent(s);
		// BUT! browsers take things like '%26' in the URL anywhere and translate it to '&' before we get our hands on the fragment part, so we need to prevent the browsers from doing this:
		s = s.replace(/%/g, '$'); // we can do this safely as encodeURIComponent() will have encoded any '$' in the original string!
		return s;
	},
	decode: function(s) {
		s = s.replace(/\$/g, '%');
		s = decodeURIComponent(s);
		return s;
	},
	clear: function() {
		this.vars.last_hash_saved = window.location.hash = "#_";
		//window.location.href = window.location.href.replace( /#.*$/, "");
		return false;
	},
	get: function(key) {
		this.load();
		return (this.vars.current.hasOwnProperty(key) ? this.vars.current[key] : null);
	},
	set: function(set) {
		var key;

		//if (typeof console !== 'undefined' && console.log) console.log('savedHistory');
		this.load();

		if (typeof set !== 'object') {
			var setSplit = set.split('=');
			set = {};
			// be aware that the _value_ of the key, value pair can have an embedded '=' (or more) itself:
			key = setSplit.shift();
			var value = setSplit.join('=');
			set[key] = value;
		}
		else {
			// do not damage the set passed in as a parameter
			set = Object.clone(set);
		}

		// var
		var hashString = '';
		var sep = '#';

		// check for change in existing vars
		for(key in this.vars.current) {
			if (this.vars.current.hasOwnProperty(key)) {
				if (set.hasOwnProperty(key)) {
					hashString += sep+this.encode(key)+'='+this.encode(set[key]);
					delete set[key];
				}
				else {
					hashString += sep+this.encode(key)+'='+this.encode(this.vars.current[key]);
				}
				sep = '&';
			}
		}

		// add new vars
		for(key in set) {
			if (set.hasOwnProperty(key)) {
				hashString += sep+this.encode(key)+'='+this.encode(set[key]);
				sep = '&';
			}
		}
		this.vars.last_hash_saved = window.location.hash = hashString;
		return this.load();
	},
	remove: function(remove) {
		var removes;
		var i;
		var key;

		this.load();

		if (typeof remove !== 'object') {
			removes = [remove]; // new Array(); is discouraged (Crockford / jsLint)
			//removes[0] = remove;
		} else {
			removes = remove;
		}

		// var
		var hashString = '';
		var sep = '#';

		for (i = 0; i < removes.length; i++) {
			if (this.vars.current.hasOwnProperty(removes[i])) {
				delete this.vars.current[removes[i]];
			}
		}

		// create new hash string
		for(key in this.vars.current) {
			if (this.vars.current.hasOwnProperty(key)) {
				hashString += sep+this.encode(key)+'='+this.encode(this.vars.current[key]);
				sep = '&';
			}
		}
		this.vars.last_hash_saved = window.location.hash = hashString;

		this.load();
		// a bit odd: this one returns the OLD set, while set() returns the UPDATED set...
		return this.vars.current;
	},
	setChangedVars: function() {
		var change_count;
		var key;
		var oldVars = Object.clone(this.vars.old);

		this.vars.changed = Object.clone(this.vars.current);

		// check for changed vars
		change_count = 0;
		for (key in this.vars.changed) {
			if (this.vars.changed.hasOwnProperty(key)) {
				if (oldVars.hasOwnProperty(key)) {
					if (oldVars[key] === this.vars.changed[key]) {
						change_count--;         // faster?/simpler than multiple 'else' branches just to track change_count
						delete this.vars.changed[key];
					}
					delete oldVars[key];
				}
				change_count++;
			}
		}
		// merge the rest of this.vars.old with the changedVars
		for (key in oldVars) {
			if (oldVars.hasOwnProperty(key) /* && !this.vars.changed.hasOwnProperty(key) */ ) {
				this.vars.changed[key] = oldVars[key];
				change_count++;
			}
		}
		this.vars.change_count = change_count;
	},
	addListener: function(listener,callAlways,bind) { // use the returned interval ID for removeListener

		this.load();
		this.vars.hash_changed = false;
		this.vars.foreign_hash_change = false;
		this.vars.old = Object.clone(this.vars.current);

		this.pollHash = function() {
			var key;

			this.load();    // side effect: an immediate check (one more) to see whether the hash has changed by us or others

			if (this.vars.hash_changed) {
				this.setChangedVars();
				if (callAlways || this.vars.foreign_hash_change) {
					// var
					/*
					if (typeof console !== 'undefined' && console.log) console.log('-----');
					if (typeof console !== 'undefined' && console.log) console.log(this.vars.old);
					if (typeof console !== 'undefined' && console.log) console.log(this.vars.changed);
					*/
					// call the given listener function
					if (typeof listener === 'function') {
						listener.apply(bind, [this.vars]);
					}

					// only reset the 'old' array, i.e. effect the '.changed' set, when the listener was actually (to be) invoked.
					//
					// also reset the 'changed' markers so changes applied inside the listener don't 'recursively' trigger the listener:
					this.load();
					this.vars.hash_changed = false;
					this.vars.foreign_hash_change = false;

					/*
					if (typeof console !== 'undefined' && console.log) console.log('-----');
					if (typeof console !== 'undefined' && console.log) console.log(this.vars.current);
					if (typeof console !== 'undefined' && console.log) console.log(this.vars.old);
					if (typeof console !== 'undefined' && console.log) console.log(this.vars.changed);
					*/
					this.vars.old = new this.vars.current.constructor();
					for (key in this.vars.current) {
						if (this.vars.current.hasOwnProperty(key)) {
							this.vars.old[key] = this.vars.current[key];
						}
					}
				}
			}
		};

		return setInterval(this.pollHash.bind(this), 500);
	},
	removeListener: function(listenerID) { // use the interval ID returned by addListener
		delete this.pollHash;
		return clearInterval(listenerID);
	}
};


/* settings for jsLint: undef: true, browser: true, indent: 4 */

