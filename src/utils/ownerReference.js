/* =========================================================
   OWNER REFERENCE SYSTEM
   A ... Z ... AA ... AB ...
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
   Exemple: soslogement-A0000
========================================================= */

function buildOwnerReference(code) {

    return `soslogement-${code}0000`;
}


/* =========================================================
   PROPERTY REFERENCE
   Exemple: soslogement-A0001
========================================================= */

function buildOfferReference(code, number) {

    return `soslogement-${code}${String(number).padStart(4, "0")}`;
}


module.exports = {
    numberToLetters,
    buildOwnerReference,
    buildOfferReference
};