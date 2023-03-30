window.onload = function() {
	document.getElementById("exec-query").addEventListener("click", query);
}

async function query() {
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
		const engine = new Comunica.QueryEngine();
		const result = await engine.query(queryString, { "sources": sources });
		console.log(result);
		const { data } = await engine.resultToString(result, "text/turtle");
		const resultString = await streamToString(data);
		document.getElementById("output").value = resultString;
	}
	else // SELECT
	{
		const engine = new Comunica.QueryEngine();
		const result = await engine.query(queryString, { "sources": sources });
		console.log(result);
		const { data } = await engine.resultToString(result, "application/sparql-results+xml");
		const resultString = await streamToString(data);
		document.getElementById("output").value = resultString;
	}
	// TO-DO: ASK https://comunica.dev/docs/query/getting_started/query_app/#6--executing-sparql-ask-queries

}

function streamToString(stream) {
  return new Promise((resolve, reject) => {
	let result = ''
	stream.on('data', (data) => {
	  result += data
	})
	stream.on('end', () => {
	  resolve(result)
	})
	stream.on('error', reject)
  })
}