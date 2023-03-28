window.onload = function() {
	document.getElementById("exec-query").addEventListener("click", query);
}

function query() {
	const baseURI = window.location.href.split('#')[0];
	const queryString = document.getElementById("query-string").value.trim();
	console.log("Query: " + queryString);

	const sources = [
			{
			  type: 'stringSource',
			  value: document.getElementById("rdf-input").value,
			  mediaType: 'text/turtle',
			  baseIRI: baseURI,
			}
		];

	if (queryString.startsWith("DESCRIBE") || queryString.startsWith("CONSTRUCT"))
	{
		const writer = new N3.Writer({ format: 'application/trig' });
		new Comunica.QueryEngine().queryQuads(queryString, { "sources": sources }).then(function (quadStream) {
			quadStream.on('data', (quad) => {
				writer.addQuad(quad);
			});
			quadStream.on('end', function() {
				writer.end((error, result) => {
					if (results != null) document.getElementById("output").value = result;
					if (error != null) document.getElementById("results").value = error;
				});
			});
		});
	}
	else // SELECT
	{
		new Comunica.QueryEngine().queryBindings(queryString, { "sources": sources }).then(function (bindingsStream) {
			bindingsStream.on('data', function (data) {
			  console.log(data.get('s').value + ' ' + data.get('p').value + ' ' + data.get('o').value);
			});
		});
	}
	// TO-DO: ASK https://comunica.dev/docs/query/getting_started/query_app/#6--executing-sparql-ask-queries
}