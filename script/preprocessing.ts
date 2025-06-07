import datas from "./certificates/out.json";

const getNumberEmailFromString = (string: string) => {
    const regexForEmail = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const regexForNumber = /(\d{10})/g;

    const email = string.match(regexForEmail);
    const number = string.match(regexForNumber);

    return { email, number };
};

const getPositionFromString = (string: string) => {
    const regexForCO = /(C[a-zA-Z]{1}O)/g;

    const positions = string.matchAll(regexForCO);

    const output = [];
    for (const position of positions) {
        output.push(position[0]);
    }

    return output;
};

const outputJsonData = [];
for (const data of datas) {
    const { email, number } = getNumberEmailFromString(data.info);

    const name =
        email && number
            ? data.info
                  .replace(email[0], "")
                  .replace(number[0], "")
                  .replaceAll(",", "")
                  .replaceAll("  ", "")
                  .trim()
            : data.info;
    const positions = getPositionFromString(data.positions);

    if (!email || !number || positions.length === 0) {
        console.log("Error in data: ", data);
        continue;
    }

    outputJsonData.push({
        ...data,
        name,
        email: email ? email[0] : "",
        number: number ? number[0] : "",
        cheif: positions,
    });
}

const parentFolder = "./script/certificates/execom";
const outputJson = `${parentFolder}/new-out.json`;

await Bun.write(outputJson, JSON.stringify(outputJsonData, null, 3));
