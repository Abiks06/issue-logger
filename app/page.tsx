import { Card, Flex, Heading } from "@radix-ui/themes";

const page = () => {
  return (
    <div>
      <Flex
        align="center"
        justify="center"
        direction="column"
        width="100%"
        minWidth="100vh"
      >
        <Card size="3" style={{ minWidth: "48rem" }}>
          <Flex direction="column" align="center" justify="center" gap="3">
            <Heading weight="medium" as="h1">
              DASHBOARD
            </Heading>
            <h2> Summary of issues</h2>
          </Flex>
        </Card>
      </Flex>

       
    </div>
  );
};

export default page;
