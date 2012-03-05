target_css = "style/bootstrap.css"
unused_rules = "rules"

css = open( target_css, "r" ).read().split( "\n" )
rules = open( unused_rules, "r" ).read().split( "\n" )

new_css = ""

for css_rule in css:
	for unused_rule in rules:
		if !css_rule.startswith( unused_rule ):
			new_css.append( unused_rule )
			break
