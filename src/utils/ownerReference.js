/* =========================================================
   OWNER REFERENCE SYSTEM
   Excel-style: A ... Z ... AA ... AZ ... BA ...
========================================================= */

function numberToLetters(number) {

    let result = "";

    while (number > 0) {

        number--;

        result =
            String.fromCharCode(
                65 + (number % 26)
            ) + result;

        number =
            Math.floor(number / 26);
    }

    return result;
}


/* =========================================================
   OWNER REFERENCE
========================================================= */

function buildOwnerReference(code) {

    return `soslogement-${code}-0000`;
}


/* =========================================================
   OFFER REFERENCE
========================================================= */

function buildOfferReference(
    code,
    number
) {

    return `soslogement-${code}-${String(number).padStart(4, "0")}`;
}


module.exports = {
    numberToLetters,
    buildOwnerReference,
    buildOfferReference
};
