export async function getServerSideProps(context) {
  const { subcategory } = context.query || {};
  const destination = subcategory
    ? `/gallery?category=cardealership&subcategory=${encodeURIComponent(subcategory)}`
    : `/gallery?category=cardealership`;

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
}

export default function ShowroomDeliveriesRedirect() {
  return null;
}


