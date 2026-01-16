import FAQItem from "./FAQItem";
import { FAQItemType } from "./types";

const faqItems: FAQItemType[] = [
  {
    id: 1,
    question: "Venue to arrive at the booking date",
    answer: [
      <span key="venue">Visit <a 
        href="https://g.co/kgs/ENqDMKL" 
        className="text-primary hover:underline" 
        target="_blank" 
        rel="noreferrer"
      >Marcopolo Cafe</a></span>
    ],
  },
  {
    id: 2,
    question: "How many photos do I get for 1 theme?",
    answer: [
      "We keep on clicking until you say there are at least 2 great clicks in any theme. While looking to capture those 2 great clicks for you, we'll end up clicking a bunch of 'good but not great' clicks along with a bunch of other great clicks. Regardless, we send you all the photos clicked in your theme, not just those 2. So the pic count per theme is not a hard and fast number but, what we've usually noted it's somewhere around 50 pics per theme.",
      "Post shoot editing 1 pic selected by you per theme is part of the service as well."
    ],
  },
  {
    id: 3,
    question: "Any complimentary extra charges?",
    answer: [
      "Props beautify the photo and sometimes add meaning to the theme. In case you order coffee at our cafe or a drink at the pub theme, that'll be directly payable between you & the venue.",
      "Wardrobe laundry & iron charges are a nominal 25 Rs per theme usage, since we need to get them ready for the next day once they are used."
    ],
  },
  {
    id: 4,
    question: "Event timings & duration",
    answer: [
      "We click 7 days a week. We don't entertain any arrivals post 4pm",
      "You have to arrive anyway between 11am & 4pm.",
      "We've noticed, usually it doesn't take more than 30 min for the customer to be satisfied with a theme."
    ],
  }
];

const FAQ = () => {
  return (
    <section className="mb-16 mt-16 flex gap-16 p-5 mx-auto my-0 max-w-[1200px] max-md:flex-col max-md:gap-8 max-md:p-4 max-sm:p-2.5">
      <header className="w-[452px] max-md:w-full">
        <h1 className="mb-6 text-4xl font-extrabold text-neutral-900 max-md:text-3xl max-sm:text-3xl font-manrope">
          Any questions? We got you.
        </h1>
        {/* <p className="text-lg leading-8 text-neutral-900 text-opacity-80 max-sm:text-base max-sm:leading-7 font-lato">
          Think photoshoots are only for fancy occasions or dating apps? Nope.
          They're for everyone, and here's why:
        </p> */}
      </header>

      <div className="flex flex-col gap-3.5 w-[688px] max-md:w-full">
        {faqItems.map((item) => (
          <FAQItem key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
};

export default FAQ;