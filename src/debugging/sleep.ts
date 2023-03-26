// useless for now

// @ts-nocheck
export async function mimir(n1, n2) {
    console.log(n1, n2)
    await sleep(4000);
  }
  
  function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }