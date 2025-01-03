# Use the official AWS Lambda Node.js 20.x runtime image
FROM public.ecr.aws/lambda/nodejs:20

# Set the working directory for the container
WORKDIR /var/task

# Copy package.json and package-lock.json (if available) to the container
COPY package*.json ./

# Install dependencies in the container
RUN npm install

# Copy the rest of the application code to the container
COPY . .

# Set the Lambda handler as the first argument
CMD ["server.handler"]
