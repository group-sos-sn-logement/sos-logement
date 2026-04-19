fetch("/properties")
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("properties");

    data.forEach(p => {
      const div = document.createElement("div");
      div.innerHTML = `
        <h3>${p.title}</h3>
        <p>${p.city}</p>
        <p>${p.price} FCFA</p>
        <hr/>
      `;
      container.appendChild(div);
    });
  });
