# docker build -t aztec-sandbox .
docker build --no-cache -t aztec-sandbox .

docker run -it --privileged aztec-sandbox
