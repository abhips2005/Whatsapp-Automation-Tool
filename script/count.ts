const data = "".split("\n").map(e => {

    const x = e.split(".")
    return {
        id: Number.parseInt(x[0]), number: x[1]
    }
} 
)

const newd = data.filter(e => !Number.isNaN(e.id) ).sort((a, b) => a.id - b.id)

console.log(newd.map(e => e.id).length)