const QUADS_MEDIA_TYPES = ["text/turtle", "application/trig", "application/n-triples", "application/n-quads", "application/ld+json"]; // not supported by Comunica: "application/rdf+xml"
const BINDINGS_MEDIA_TYPES = ["application/sparql-results+json", "application/sparql-results+xml"]; // not supported by Comunica: "application/sparql-results+csv"

window.onload = function() {
    document.getElementById("exec-query").addEventListener("click", query);
}

async function query() {
    const baseURI = window.location.href.split('#')[0];
    const queryString = document.getElementById("query-string").value.trim();
    const inputMediaType = document.getElementById("rdf-input-media-type").value;
    const sources = [{
        type: 'stringSource',
        value: document.getElementById("rdf-input").value,
        mediaType: inputMediaType,
        baseIRI: baseURI,
    }];

    const engine = new Comunica.QueryEngine();
    const resultsDiv = document.getElementById("results");
    const outputTextarea = document.getElementById("output");

    try {
        var result = await engine.query(queryString, {
            "sources": sources
        });
        const outputMediaTypeSelect = document.getElementById("output-media-type");

        // make sure the selected output media type is compatible with the result type (reset it if it's not)
        if (result.resultType == "quads") {
            if (!QUADS_MEDIA_TYPES.includes(outputMediaTypeSelect.value)) outputMediaTypeSelect.value = QUADS_MEDIA_TYPES[0];
            outputMediaTypeSelect.querySelector("optgroup[value = 'quads']").disabled = false;
            outputMediaTypeSelect.querySelector("optgroup[value = 'bindings']").disabled = true;
        }
        if (result.resultType == "bindings") {
            if (!BINDINGS_MEDIA_TYPES.includes(outputMediaTypeSelect.value)) outputMediaTypeSelect.value = BINDINGS_MEDIA_TYPES[0];
            outputMediaTypeSelect.querySelector("optgroup[value = 'bindings']").disabled = false;
            outputMediaTypeSelect.querySelector("optgroup[value = 'quads']").disabled = true;
        }

        const outputMediaType = outputMediaTypeSelect.value;
        const {
            data
        } = await engine.resultToString(result, outputMediaType);
        const resultString = await streamToString(data);
        outputTextarea.value = resultString;

        // query again to get results in JSON which will be used to render HTML results
        result = await engine.query(queryString, {
            "sources": sources
        });
        if (result.resultType == "quads") {
            const {
                data
            } = await engine.resultToString(result, "application/ld+json");
            const jsonString = await streamToString(data);
            const resultJson = JSON.parse(jsonString);

            renderJSONLD(resultJson, resultsDiv);
        }
        if (result.resultType == "bindings") {
            const {
                data
            } = await engine.resultToString(result, "application/sparql-results+json");
            const jsonString = await streamToString(data);
            const resultJson = JSON.parse(jsonString);

            renderSPARQLJSON(resultJson, resultsDiv);
        }
    } catch (error) {
        outputTextarea.value = "";
        const errorDiv = document.createElement("div");
        errorDiv.className = "alert alert-danger";
        const errorText = document.createTextNode(error.toString());
        errorDiv.appendChild(errorText);
        resultsDiv.replaceChildren(errorDiv);
    }
}

function streamToString(stream) {
    return new Promise((resolve, reject) => {
        let result = ''
        stream.on('data', (data) => result += data)
        stream.on('end', () => resolve(result))
        stream.on('error', reject)
    });
}

function renderJSONLD(resultJson, resultsDiv) {
    const resultsTable = document.createElement("table");
    resultsTable.className = "table"; // for Bootstrap
    resultsDiv.replaceChildren(resultsTable);

    const resultsTHead = document.createElement("thead");
    resultsTable.appendChild(resultsTHead);
    const resultsVarTR = document.createElement("tr");
    resultsTHead.appendChild(resultsVarTR);

    for (var variable of ["s", "p", "o"]) {
        const resultsVarTH = document.createElement("th");
        resultsVarTR.appendChild(resultsVarTH);
        const resultsVarText = document.createTextNode(variable);
        resultsVarTH.appendChild(resultsVarText);
    }

    const resultsTBody = document.createElement("tbody");
    resultsTable.appendChild(resultsTBody);

    resultJson.forEach(function(resource) {
        const keys = Object.keys(resource);

        keys.filter(key => key != "@id" && key != "@type").forEach((property, index) => {
            const valuesObjs = resource[property];

            valuesObjs.forEach((valueObj) => {
                const tripleTR = document.createElement("tr");
                resultsTBody.appendChild(tripleTR);

                const subjectTD = document.createElement("td");
                tripleTR.appendChild(subjectTD);
                const subjectText = document.createTextNode("<" + resource["@id"] + ">"); // TO-DO: _:bnode
                subjectTD.appendChild(subjectText);

                const propertyTD = document.createElement("td");
                tripleTR.appendChild(propertyTD);
                const propertyText = document.createTextNode("<" + property + ">");
                propertyTD.appendChild(propertyText);

                const objectTD = document.createElement("td");
                tripleTR.appendChild(objectTD);

                var objectString = (valueObj["@value"]) ? "\"" + valueObj["@value"] + "\"" : "<" + valueObj["@id"] + ">"; // TO-DO: _:bnode
                if (valueObj["@type"]) objectString += "^^" + "<" + valueObj["@type"] + ">";
                if (valueObj["@language"]) objectString += "@" + valueObj["@language"];

                const objectText = document.createTextNode(objectString);
                objectTD.appendChild(objectText);
            });
        });

        if (resource["@type"]) {
            resource["@type"].forEach((typeObj) => {
                const tripleTR = document.createElement("tr");
                resultsTBody.appendChild(tripleTR);

                const subjectTD = document.createElement("td");
                tripleTR.appendChild(subjectTD);
                const subjectText = document.createTextNode("<" + resource["@id"] + ">"); // TO-DO: _:bnode
                subjectTD.appendChild(subjectText);

                const propertyTD = document.createElement("td");
                tripleTR.appendChild(propertyTD);
                const propertyText = document.createTextNode("<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>");
                propertyTD.appendChild(propertyText);

                const objectTD = document.createElement("td");
                tripleTR.appendChild(objectTD);

                var objectString;
                if (typeof typeObj === 'string') objectString = "<" + typeObj + ">";
                else {
                    objectString = (typeObj["@value"]) ? "\"" + typeObj["@value"] + "\"" : "<" + typeObj["@id"] + ">"; // TO-DO: _:bnode
                    if (typeObj["@type"]) objectString += "^^" + "<" + typeObj["@type"] + ">";
                    if (typeObj["@language"]) objectString += "@" + typeObj["@language"];
                }

                const objectText = document.createTextNode(objectString);
                objectTD.appendChild(objectText);
            });
        }
    });
}

function renderSPARQLJSON(resultJson, resultsDiv) {
    const resultsTable = document.createElement("table");
    resultsTable.className = "table"; // for Bootstrap
    resultsDiv.replaceChildren(resultsTable);

    const resultsTHead = document.createElement("thead");
    resultsTable.appendChild(resultsTHead);
    const resultsVarTR = document.createElement("tr");
    resultsTHead.appendChild(resultsVarTR);

    for (var variable of resultJson.head.vars) {
        const resultsVarTH = document.createElement("th");
        resultsVarTR.appendChild(resultsVarTH);
        const resultsVarText = document.createTextNode(variable);
        resultsVarTH.appendChild(resultsVarText);
    }

    const resultsTBody = document.createElement("tbody");
    resultsTable.appendChild(resultsTBody);

    for (var binding of resultJson.results.bindings) {
        const resultsBindingTR = document.createElement("tr");
        resultsTBody.appendChild(resultsBindingTR);

        for (var variable of resultJson.head.vars) {
            const resultsBindingTD = document.createElement("td");
            resultsBindingTR.appendChild(resultsBindingTD);

            const value = binding[variable].value;
            var resultsBindingString = (binding[variable].type == "literal") ? "\"" + value + "\"" : "<" + value + ">";
            if (binding[variable].datatype) resultsBindingString += "^^" + "<" + binding[variable].datatype + ">";
            if (binding[variable]["xml:lang"]) resultsBindingString += "@" + binding[variable]["xml:lang"];
            const resultsBindingText = document.createTextNode(resultsBindingString);
            resultsBindingTD.appendChild(resultsBindingText);
        }
    }
}