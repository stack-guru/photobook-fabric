function ybSupportLoad()
{
	var scriptElement=document.createElement('script');
	scriptElement.type = 'text/javascript';
	if (is_dev_or_localhost())
		scriptElement.src = "/fe/assets/js/fabric/yb_support.js";
	else
		scriptElement.src = "/fe/assets/js/fabric/yb_support_min_20221220.js";
	document.head.appendChild(scriptElement);
}