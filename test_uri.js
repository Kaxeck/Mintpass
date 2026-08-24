const img = "https://metadata.mintpass.app/ticket";
const json = { name: "Ticket", image: img, attributes: [{ trait_type: "Tipo", value: "Boleto Digital" }] };
const dataUri = `data:application/json,${encodeURIComponent(JSON.stringify(json))}`;
console.log(dataUri.length);
