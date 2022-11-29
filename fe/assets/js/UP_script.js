
var LOGIN_PATH = '/auth/login';

// The backend server is not required because it is accessed with /api
if (location.hostname.indexOf('localhost.') != -1) {
	var YEARBOOK_SERVER = "https://localhost.yearbook-master.com";
} else if (location.hostname.indexOf('dev.') != -1) {
	var YEARBOOK_SERVER = "https://dev.yearbook-master.com";
} else {
	var YEARBOOK_SERVER = "https://yearbook-master.com";
}

function ajax_error(xhr)
{
	if (xhr.status == 403) {
		alert("Session expired");
		window.location.href = LOGIN_PATH;
	}
	else {
		// xhr.status == 0 && xhr.readyState == 0 -> aborted 
		if (xhr.status != 0 || xhr.readyState != 0)
			alert("Unexpected error code in ajax call status [" + xhr.status + "] statusText [" + xhr.statusText + "] readyState [" + xhr.readyState + "]");
	}
}

// the PHP requests return "login" instead a 403 status
function check_login_ajax(data)
{
	if (data == 'login') 
	{
		url = new URL(window.location.href);		
		if (url.pathname.indexOf('/fe/clients') == 0 || url.pathname.indexOf('/fe/staff') == 0) 
			$(location).attr('href', '/auth/logout');
		else // url.pathname.indexOf('/fe/com_users') == 0)
			$(location).attr('href', '/red/logout_com'); 
		return false; 
	} //redirect to login
	else
		return true;
}

function is_client_page()
{
	url = new URL(window.location.href);		
	return url.pathname.indexOf('/fe/clients') == 0;
}

function is_com_user_page()
{
	url = new URL(window.location.href);		
	return url.pathname.indexOf('/fe/com_users') == 0;
}

function is_staff_page()
{
	url = new URL(window.location.href);		
	return url.pathname.indexOf('/fe/staff') == 0;
}

function is_dev_or_localhost()
{
	url = new URL(window.location.href);		
	return (url.hostname.indexOf('dev.') == 0 ||  url.hostname.indexOf('localhost.') == 0);
}

function logToServer(message) 
{
	$.ajax({
		url: '/api/jslog/logError_ajax',
		data: "message="+message,
		type: "POST",
		dataType: 'json',
		xhrFields: {withCredentials: true},
		crossDomain: false,
		error: ajax_error,
	});
}


function up_email_helper() 
{
	$('input[type=email]').on('keypress', function(e)
	{
		if (e.which == 32)
			return false;
	});

	$('input[type=email]').css('text-transform', 'lowercase');

	$.validator.addMethod("email_trimmed", function(value, element)
	{	
		var val = $.trim(value.toLowerCase());
		// $(element).val(val); This doesn't work in Chrome
		$(element).attr("value", val);
		return this.optional(element) || /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i.test(val);
	}, "Please enter a valid email address.");
}

function makeMessage(message, messageStyle, delayit) {
	var messageText = '<div style="text-align:center" class="alert alert-'+messageStyle+'">';
	messageText = messageText+'<b>'+message+'</b></div>';
	displayMessage(messageText,delayit);
}

function displayMessage(messageText, delayit) {
	delayit = delayit || false;
	$("#messages").show();
	//set timer to shut off message after 2 seconds.
	if (!delayit)
		$("#messages").html(messageText);
	else
		$("#messages").html(messageText).delay(10000).fadeOut(1000);
	//scroll to top of screen
	$("html, body").animate({ scrollTop: 0 }, "slow");
}

function getUrlParams()
{
	var url = window.location.href;
	var queryString = url.split("?")[1];
  	var queryParams = new Object();
	if (queryString) { 
		var keyValuePairs = queryString.split("&");
		var keyValue = [];
		keyValuePairs.forEach(function(pair) {
			keyValue = pair.split("=");
			queryParams[keyValue[0]] = decodeURIComponent(keyValue[1]).replace(/\+/g, " ");
		});
	}
	return queryParams;
	
/*
	var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
      vars[key] = value;
    });
    return vars;
 */
 
}

function php_addslashes(string) {
	return string.replace(/\\/g, '\\\\').
		replace(/\u0008/g, '\\b').
		replace(/\t/g, '\\t').
		replace(/\n/g, '\\n').
		replace(/\f/g, '\\f').
		replace(/\r/g, '\\r').
		replace(/'/g, '\\\'').
		replace(/"/g, '\\"');
}

function php_htmlspecialchars(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function php_empty (mixedVar) {
	//  discuss at: https://locutus.io/php/empty/
	// original by: Philippe Baumann
	//    input by: Onno Marsman (https://twitter.com/onnomarsman)
	//    input by: LH
	//    input by: Stoyan Kyosev (https://www.svest.org/)
	// bugfixed by: Kevin van Zonneveld (https://kvz.io)
	// improved by: Onno Marsman (https://twitter.com/onnomarsman)
	// improved by: Francesco
	// improved by: Marc Jansen
	// improved by: Rafal Kukawski (https://blog.kukawski.pl)
	//   example 1: empty(null)
	//   returns 1: true
	//   example 2: empty(undefined)
	//   returns 2: true
	//   example 3: empty([])
	//   returns 3: true
	//   example 4: empty({})
	//   returns 4: true
	//   example 5: empty({'aFunc' : function () { alert('humpty'); } })
	//   returns 5: false

	var undef
	var key
	var i
	var len
	var emptyValues = [undef, null, false, 0, '', '0']

	for (i = 0, len = emptyValues.length; i < len; i++) {
		if (mixedVar === emptyValues[i]) {
			return true
		}
	}

	if (typeof mixedVar === 'object') {
		for (key in mixedVar) {
			if (mixedVar.hasOwnProperty(key)) {
				return false
			}
		}
		return true
	}
	return false
}

function php_count (mixedVar, mode) {
	//  discuss at: https://locutus.io/php/count/
	// original by: Kevin van Zonneveld (https://kvz.io)
	//    input by: Waldo Malqui Silva (https://waldo.malqui.info)
	//    input by: merabi
	// bugfixed by: Soren Hansen
	// bugfixed by: Olivier Louvignes (https://mg-crea.com/)
	// improved by: Brett Zamir (https://brett-zamir.me)
	//   example 1: count([[0,0],[0,-4]], 'COUNT_RECURSIVE')
	//   returns 1: 6
	//   example 2: count({'one' : [1,2,3,4,5]}, 'COUNT_RECURSIVE')
	//   returns 2: 6

	var key
	var cnt = 0

	if (mixedVar === null || typeof mixedVar === 'undefined') {
		return 0
	} else if (mixedVar.constructor !== Array && mixedVar.constructor !== Object) {
		return 1
	}

	if (mode === 'COUNT_RECURSIVE') {
		mode = 1
	}
	if (mode !== 1) {
		mode = 0
	}

	for (key in mixedVar) {
		if (mixedVar.hasOwnProperty(key)) {
			cnt++
			if (mode === 1 && mixedVar[key] && (mixedVar[key].constructor === Array || mixedVar[key].constructor === Object)) {
				cnt += count(mixedVar[key], 1)
			}
		}
	}

	return cnt
}

function php_explode(delimiter, string, limit) {
	//  discuss at: https://locutus.io/php/explode/
	// original by: Kevin van Zonneveld (https://kvz.io)
	//   example 1: explode(' ', 'Kevin van Zonneveld')
	//   returns 1: [ 'Kevin', 'van', 'Zonneveld' ]

	if (arguments.length < 2 || typeof delimiter === 'undefined' || typeof string === 'undefined') {
		return null
	}
	if (delimiter === '' || delimiter === false || delimiter === null) {
		return false
	}
	if (typeof delimiter === 'function' || typeof delimiter === 'object' || typeof string === 'function' || typeof string === 'object') {
		return {0: ''}
	}
	if (delimiter === true) {
		delimiter = '1'
	}

	// Here we go...
	delimiter += ''
	string += ''

	var s = string.split(delimiter)

	if (typeof limit === 'undefined') return s

	// Support for limit
	if (limit === 0) limit = 1

	// Positive limit
	if (limit > 0) {
		if (limit >= s.length) {
			return s
		}
		return s.slice(0, limit - 1).concat([s.slice(limit - 1).join(delimiter)])
	}

	// Negative limit
	if (-limit >= s.length) {
		return []
	}

	s.splice(s.length + limit)
	return s
}

function php_in_array (needle, haystack, argStrict) { // eslint-disable-line camelcase
	//  discuss at: https://locutus.io/php/in_array/
	// original by: Kevin van Zonneveld (https://kvz.io)
	// improved by: vlado houba
	// improved by: Jonas Sciangula Street (Joni2Back)
	//    input by: Billy
	// bugfixed by: Brett Zamir (https://brett-zamir.me)
	//   example 1: in_array('van', ['Kevin', 'van', 'Zonneveld'])
	//   returns 1: true
	//   example 2: in_array('vlado', {0: 'Kevin', vlado: 'van', 1: 'Zonneveld'})
	//   returns 2: false
	//   example 3: in_array(1, ['1', '2', '3'])
	//   example 3: in_array(1, ['1', '2', '3'], false)
	//   returns 3: true
	//   returns 3: true
	//   example 4: in_array(1, ['1', '2', '3'], true)
	//   returns 4: false

	var key = ''
	var strict = !!argStrict

	// we prevent the double check (strict && arr[key] === ndl) || (!strict && arr[key] === ndl)
	// in just one for, in order to improve the performance
	// deciding wich type of comparation will do before walk array
	if (strict) {
		for (key in haystack) {
			if (haystack[key] === needle) {
				return true
			}
		}
	} else {
		for (key in haystack) {
			if (haystack[key] == needle) { // eslint-disable-line eqeqeq
				return true
			}
		}
	}

	return false
}