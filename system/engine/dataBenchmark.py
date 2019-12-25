# pip install bokeh
# WIN -> conda install pytorch torchvision cpuonly -c pytorch
# LINUX -> pip3 install torch==1.3.1+cpu torchvision==0.4.2+cpu -f https://download.pytorch.org/whl/torch_stable.html
from bokeh.plotting import figure
from bokeh.resources import CDN
from bokeh.embed import file_html, json_item
from bokeh.models import ColumnDataSource
import json

# plot = figure()
# plot.circle([1,2], [3,4])

# item_text = json.dumps(json_item(plot, "myplot"))


# Use just like a ColumnDataSource
# p.circle('x', 'y', source=source)


# print(item_text)ac   
# https://docs.bokeh.org/en/1.4.0/docs/user_guide/data.html#ajaxdatasource