const Apify = require('apify');

const {
    utils: { log },
} = Apify;
const { applyFunction } = require('./utils');

exports.SEARCH_PAGE = async (page, request, query, maxPostCount, evaledFunc) => {
    // CHECK FOR SELECTOR
    let { savedItems, pageNumber } = request.userData;
    const { hostname } = request.userData;

    await page.waitForSelector('#sh-osd__online-sellers-grid');

    const resultsLength = await page.evaluate(() => {
        return document.getElementById('sh-osd__online-sellers-cont').children.length;
    });


    // check HTML if page has no results
    if (resultsLength === 0) {
        log.warning('The page has no results. Check dataset for more info.');

        await Apify.pushData({
            '#debug': Apify.utils.createRequestDebugInfo(request),
        });
    }


    log.info(`Found ${resultsLength} products on the page.`);
    // eslint-disable-next-line no-shadow
    const data = await page.evaluate(
        (maxPostCount, query, savedItems) => {
            // nodes with items
            let results = Array.from(document.querySelectorAll('#sh-osd__online-sellers-cont > tr'));
            if (results.length === 0) results = Array.from(document.querySelectorAll('#sh-osd__online-sellers-cont > tr'));
            // limit the results to be scraped, if maxPostCount exists
            if (maxPostCount) {
                results = results.slice(0, maxPostCount - savedItems);
            }
            // limit the results to be scraped, if maxPostCount exists
            // eslint-disable-next-line no-shadow
            const data = [];
            // ITERATING NODES TO GET RESULTS
            for (let i = 0; i < results.length; i++) {
                const item = results[i];
                // KEYS OF OUTPUT OBJ
                const company = item.querySelector("#sh-osd__online-sellers-cont > tr > td > div.kPMwsc > a")?.innerText ?? null;

                const price = item.querySelector("#sh-osd__online-sellers-cont > tr > td > span")?.innerText ?? null;

                const details = item.querySelector("#sh-osd__online-sellers-cont > tr > td.SH30Lb.yGibJf > div")?.innerText ?? null;

                const total = item.querySelector("#sh-osd__online-sellers-cont > tr > td > div > div.drzWO")?.innerText ?? null;

                // FINAL OUTPUT OBJ
                const output = {
                    query,
                    company,
                    details,
                    price,
                    total,
                    positionOnSearchPage: i + 1,
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