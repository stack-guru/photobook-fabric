// JavaScript Document
(function($) {
    		
	FormValidation.Validator.password = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') {
                return true;
            }

            // Check the password strength
            if (value.length < 8) {
                return {
                    valid: false,
                    message: 'The password must be more than 8 characters long.'
                };
            }
          

            // The password doesn't contain any digit
            if (value.search(/[0-9]/) < 0) {
                return {
                    valid: false,
                    message: 'The password must contain at least one digit.'
                }
            }
			
			// The password doesn't contain any special characters			
            if (value.search(/([!,%,&,@,#,$,^,*,?,_,~])/) < 0) {
                return {
                    valid: false,
                    message: 'The password must contain at least one special character.'
                }
            }

            return true;
        }
    };
	
	FormValidation.Validator.letterswithbasicpunc = { 
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }             
            if (/^[a-z-.,()'\"\s]+$/i.test(value) == false) {
                return {
                    valid: false,
                    message: 'Letters or punctuation only please.'
                }
            }	
            return true;
        }
    };
	
	FormValidation.Validator.letterswithbasicpunc_and_accented = { 
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }             
            if (/^[a-z-.,()'\"áÁéÉíÍóÓúÚýÝäÄëËïÏöÖüÜÿŸãÃñÑõÕâÂêÊîÎôÔûÛàÀèÈìÌòÒùÙ\s]+$/i.test(value) == false) {
                return {
                    valid: false,
                    message: 'Letters, accents, or punctuation only please.'
                }
            }	
            return true;
        }
    };
	
	FormValidation.Validator.alphahumericwithbasicpunc = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }             
            if (/^[a-z-.,()'\"\s\d]+$/i.test(value) == false) {
                return {
                    valid: false,
                    message: 'Letters, numbers, or punctuation only please.'
                }
            }	
            return true;
        }
    };
	
	FormValidation.Validator.alphahumericwithbasicpunc_extra = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }             
            if (/^[a-z-.,()'\"áÁéÉíÍóÓúÚýÝäÄëËïÏöÖüÜÿŸãÃñÑõÕâÂêÊîÎôÔûÛàÀèÈìÌòÒùÙ\s\d\\\|\&]+$/i.test(value) == false) {
                return {
                    valid: false,
                    message: 'Letters, numbers, or punctuation only please.'
                }
            }	
            return true;
        }
    };
			
	FormValidation.Validator.alphanumeric = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }             
            if (/^[a-z\s\d]*$/i.test(value) == false) {
                return {
                    valid: false,
                    message: 'Letters, numbers, or spaces only please.'
                }
            }	
            return true;
        }
    };
	
	FormValidation.Validator.alphanumeric_nospace = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }               
            if (/^[A-Z\d]*$/.test(value) == false) {
                return {
                    valid: false,
                    message: 'Capital letters or numbers only please.'
                }
            }	
            return true;
        }
    };
	
	FormValidation.Validator.not_begins_with_no_case = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; } 					              
            if (value.toLowerCase().indexOf(options.str) == 0) {
                return {
                    valid: false,
                    message: 'You cannot start with the word "'+options.str+'".'
                }
            }	
            return true;
        }
    };
	
	FormValidation.Validator.alphanumeric_nospace_nocase = {
        validate: function(validator, $field, options) {
            var value = $field.val();
            if (value === '') { return true; }             
            if (/^[A-Z\d]*$/i.test(value) == false) {
                return {
                    valid: false,
                    message: 'Letters or numbers only please.'
                }
            }	
            return true;
        }
    };

	
	
}(window.jQuery));