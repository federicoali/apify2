const Apify = require('apify');

const {
    utils: { log },
} = Apify;
const { applyFunction } = require('./utils');

exports.SEARCH_PAGE = async (page, request, query, requestQueue, maxPostCount, evaledFunc) => {
    // CHECK FOR SELECTOR
    let { savedItems, pageNumber } = request.userData;
    const { hostname } = request.userData;

    await page.waitForSelector('table.d0wB0c');


    // eslint-disable-next-line no-shadow
    const data = await page.evaluate(
        (maxPostCount, query, savedItems) => {
            const resultsLength = document.querySelector('.sh-osd__online-sellers-grid').rows.length;


            // nodes with items
            let results = Array.from(document.querySelectorAll('tbody.sh-osd__online-sellers-cont'));

            // limit the results to be scraped, if maxPostCount exists
            if (maxPostCount) {
                results = results.slice(0, maxPostCount - savedItems);
            }

            // eslint-disable-next-line no-shadow
            const data = [];
            // ITERATING NODES TO GET RESULTS
            for (let i = 0; i < results.length; i++) {
                // Please pay attention that "merchantMetrics" and "reviewsLink" were removed from the  "SEARCH" page.
                const item = results[i];
                // KEYS OF OUTPUT OBJ
                const company = document.querySelector("#sh-osd__online-sellers-cont > tr:nth-child(1) > td:nth-child(1) > div.kPMwsc > a");

                const price = document.querySelector("#sh-osd__online-sellers-cont > tr:nth-child(1) > td:nth-child(3) > span");

                const details = document.querySelector("#sh-osd__online-sellers-cont > tr:nth-child(1) > td.SH30Lb.yGibJf > div");

                const total = document.querySelector("#sh-osd__online-sellers-cont > tr:nth-child(1) > td:nth-child(4) > div > div.drzWO");

                // FINAL OUTPUT OBJ
                const output = {
                    query,
                    company,
                    details,
                    price,
                    total,
                    positionOnSearchPage: i + 1,
                    productDetails: item.querySelectorAll('.translate-content')[1]?.textContent.trim(),
                };

                data.push(output);
            }

            return data;
        },
        maxPostCount,
        query,
        savedItems,
    );
    // ITERATING ITEMS TO EXTEND WITH USERS FUNCTION
    for (let item of data) {
        if (evaledFunc) {
            item = await applyFunction(page, evaledFunc, item);
        }

        await Apify.pushData(item);
        savedItems++;
    }
    log.info(`${Math.min(maxPostCount, resultsLength)} items on the page were successfully scraped.`);
};
