(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['footer'] = template({"1":function(depth0,helpers,partials,data) {
    return "			<li class=\"menu-item\">"
    + this.escapeExpression(this.lambda(depth0, depth0))
    + "</li>\n";
},"compiler":[6,">= 2.0.0-beta.1"],"main":function(depth0,helpers,partials,data) {
    var stack1, helper, alias1=helpers.helperMissing, alias2="function", alias3=this.escapeExpression;

  return "<div id=\"status-line\"><span class=\"mode "
    + alias3(((helper = (helper = helpers.mode || (depth0 != null ? depth0.mode : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"mode","hash":{},"data":data}) : helper)))
    + "\">"
    + alias3(((helper = (helper = helpers.mode || (depth0 != null ? depth0.mode : depth0)) != null ? helper : alias1),(typeof helper === alias2 ? helper.call(depth0,{"name":"mode","hash":{},"data":data}) : helper)))
    + "</span><span class=\"file\">unsaved</span></div>\n<div id=\"command-window\"><input id=\"command-prompt\" type=\"text\" disabled=\"disabled\"/></div>\n\n<div id=\"mode-menu-container\">\n	<ul id=\"mode-menu\">\n"
    + ((stack1 = helpers.each.call(depth0,(depth0 != null ? depth0.options : depth0),{"name":"each","hash":{},"fn":this.program(1, data, 0),"inverse":this.noop,"data":data})) != null ? stack1 : "")
    + "	</ul>\n\n	<input id=\"menu-prompt\" type=\"text\" onfocus=\"this.value = this.value;\" disabled=\"disabled\"/>\n</div>\n";
},"useData":true});
})();