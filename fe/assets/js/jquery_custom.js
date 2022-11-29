//for styling tables.
//found this here. http://stackoverflow.com/questions/2613632/jquery-ui-themes-and-html-tables

(function ($) {
	$.fn.styleTable = function (options) {
		//Set default option for style
		var defaults = {
			css: 'styleTable'
		};
		options = $.extend(defaults, options);

		//Check if element is visible
		//if($(this).is(':visible')){

			//Check if class is aleady applied
			//if(! ($(this).hasClass(options.css)) ){                     

				//Loop through elements of table and apply styling
				return this.each(function () {

					input = $(this);
					input.addClass(options.css);

					input.find("tr").live('mouseover mouseout', function (event) {
						if (event.type == 'mouseover') {
							$(this).children("td").addClass("ui-state-hover");
						} else {
							$(this).children("td").removeClass("ui-state-hover");
						}
					});

					input.find("th").addClass("ui-state-default");
					input.find("td").addClass("ui-widget-content");

					input.find("tr").each(function () {
						$(this).children("td:not(:first)").addClass("first");
						$(this).children("th:not(:first)").addClass("first");
					});
				});
			//}
		//}
	};
})(jQuery);

//test if element exists or not.
$.fn.doesExist = function(){
	return jQuery(this).length > 0;
}

function rawurlencode(str) {
 str = (str + '').toString();
  // Tilde should be allowed unescaped in future versions of PHP (as reflected below), but if you want to reflect current
  // PHP behavior, you would need to add ".replace(/~/g, '%7E');" to the following.
  return encodeURIComponent(str).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').
  replace(/\)/g, '%29').replace(/\*/g, '%2A');
}

function nl2br(str, is_xhtml) {  
  var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>'; // Adjust comment to avoid issue on phpjs.org display
  return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + breakTag + '$2');
}

//checked if not logged in reply.
function Should_Login(data, base_url) {
	if (data == 'login') { $(location).attr('href',base_url+'auth/logout'); return false; } //redirect to login	
	else return true; 
}

//checked if not logged in reply.
function Should_Login_com(data, base_url) {
	if (data == 'login') { $(location).attr('href',base_url+'red/logout_com'); return false; } //redirect to login
	else return true;
}

function clear_form_elements(selector_name, data) {
  
	if (!data) {
    
		$(selector_name).find(':input').each(function() {
		
			switch(this.type) {
				case 'password':
				case 'text':
				case 'textarea':
				case 'file':				
				case 'select-multiple':
					$(this).val('');
					break;
				case 'select-one':
					$(this).prop('selectedIndex',0);
					break;	
				case 'checkbox':
				case 'radio':
					this.checked = false;
			}
		});
  
	} else {
	
		$(':input',selector_name).each(function() {
		
			switch(this.type) {
				case 'password':
				case 'text':
				case 'textarea':
				case 'file':				
				case 'select-multiple':
					$(this).val('');
					break;
				case 'select-one':
					$(this).prop('selectedIndex',0);
					break;	
				case 'checkbox':
				case 'radio':
					this.checked = false;
			}
		});
	  
	}

};

$.preloadImages = function()
{
	for (var i = 0; i < arguments.length; i++)
	{
		$("<img />").attr("src", arguments[i]);
	}
};

(function ($) {
	$.fn.reverse = [].reverse;	
})(jQuery);

$.fn.rotate = function(degrees, origin) {
    $(this).css({'-webkit-transform' : 'rotate('+ degrees +'deg)',
                 '-moz-transform' : 'rotate('+ degrees +'deg)',
                 '-ms-transform' : 'rotate('+ degrees +'deg)',
                 'transform' : 'rotate('+ degrees +'deg)',
				 '-ms-transform-origin' : origin.x+' '+origin.y, /* IE 9 */
				'-webkit-transform-origin' : origin.x+' '+origin.y, /* Chrome, Safari, Opera */
				'transform-origin' : origin.x+' '+origin.y				 
				 });
    return $(this);
};

var loadScript = function (path) {
    var result = $.Deferred(),
        script = document.createElement("script");
    script.async = "async";
    script.type = "text/javascript";
    script.src = path;
    script.onload = script.onreadystatechange = function(_, isAbort) {
        if (!script.readyState || /loaded|complete/.test(script.readyState)) {
            if (isAbort)
                result.reject();
            else
                result.resolve();
        }
    };
    script.onerror = function () { result.reject(); };
    $("head")[0].appendChild(script);
    return result.promise();
};


function CheckInput(e,_this,flag)
{
	var filter = $(_this).attr("char"),
		char = String.fromCharCode(e.which),
		regex = new RegExp('[^'+filter+']+$', flag);

	if (!regex.test(char))
	{
		e.returnValue = false;
		if (e.preventDefault)
			e.preventDefault();
	}
}

