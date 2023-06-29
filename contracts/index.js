const res = await fetch('http://localhost:3001', {
	method: 'POST',
	body: JSON.stringify({
		address: '0xBF4979305B43B0eB5Bb6a5C67ffB89408803d3e1',
	}),
	headers: {
		'Content-Type': 'application/json',
	},
});

const data = await res.json();
console.log(data);
